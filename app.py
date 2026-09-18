from flask import Flask, render_template, request, jsonify
from flask_cors import CORS
from werkzeug.utils import secure_filename
import os
import json
import uuid
import PyPDF2
from google import genai


# =========================================================
# LEARNMIRROR AI
# Flask + Gemini API
# =========================================================

app = Flask(__name__)
CORS(app)

# =========================================================
# CONFIGURATION
# =========================================================

UPLOAD_FOLDER = "uploads"
ALLOWED_EXTENSIONS = {"pdf"}

app.config["UPLOAD_FOLDER"] = UPLOAD_FOLDER

# Maximum upload size: 10 MB
app.config["MAX_CONTENT_LENGTH"] = 10 * 1024 * 1024

os.makedirs(UPLOAD_FOLDER, exist_ok=True)


# =========================================================
# GEMINI CONFIGURATION
# =========================================================

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

# Primary model + lightweight fallbacks.
# These are current stable Gemini API model IDs.
GEMINI_MODELS = [
    "gemini-3.5-flash-lite",
    "gemini-3.6-flash",
    "gemini-2.5-flash",
]

# Kept for existing console messages / compatibility.
GEMINI_MODEL = GEMINI_MODELS[0]

if not GEMINI_API_KEY:
    print("WARNING: GEMINI_API_KEY is not set.")

gemini_client = (
    genai.Client(api_key=GEMINI_API_KEY)
    if GEMINI_API_KEY
    else None
)


class GeminiServiceError(RuntimeError):
    """Safe, user-facing Gemini service error."""
    pass


def call_gemini(prompt):
    """
    Send a prompt to Gemini with retry + model fallback.

    A temporary 503/high-demand response should not break the
    LearnMirror AI experience. We retry the same model briefly,
    then move to the next stable fallback model.
    """
    if not gemini_client:
        raise GeminiServiceError(
            "AI service is not configured. Please check GEMINI_API_KEY."
        )

    import time

    last_error = None

    for model in GEMINI_MODELS:
        for attempt in range(2):
            try:
                print(
                    f"Gemini request -> model={model}, "
                    f"attempt={attempt + 1}/2"
                )

                response = gemini_client.models.generate_content(
                    model=model,
                    contents=prompt
                )

                answer = getattr(response, "text", None)

                if answer and answer.strip():
                    print(f"Gemini success -> model={model}")
                    return answer.strip()

                last_error = RuntimeError(
                    f"{model} returned an empty response."
                )

            except Exception as e:
                last_error = e
                error_text = str(e).lower()

                is_temporary = (
                    "503" in error_text
                    or "unavailable" in error_text
                    or "high demand" in error_text
                    or "temporarily" in error_text
                    or "service unavailable" in error_text
                    or "429" in error_text
                    or "rate limit" in error_text
                    or "resource exhausted" in error_text
                )

                print(
                    f"Gemini error -> model={model}, "
                    f"attempt={attempt + 1}: {type(e).__name__}: {e}"
                )

                if not is_temporary:
                    # For non-temporary errors, try the next model once
                    # rather than exposing the raw provider error.
                    break

                if attempt == 0:
                    time.sleep(1.5)

    print(
        "All Gemini models/retries failed.",
        type(last_error).__name__ if last_error else ""
    )

    raise GeminiServiceError(
        "The AI service is temporarily busy. "
        "Please try again in a few seconds."
    )
# HELPER FUNCTIONS
# =========================================================

def allowed_file(filename):
    """
    Check whether the uploaded file is a PDF.
    """

    return (
        filename
        and "." in filename
        and filename.rsplit(".", 1)[1].lower()
        in ALLOWED_EXTENSIONS
    )


def safe_score(value):
    """
    Convert an AI-generated score into a safe integer
    between 0 and 100.
    """

    try:

        value = int(float(value))

    except (ValueError, TypeError):

        value = 0

    return max(0, min(100, value))


def extract_json_from_ai(text):
    """
    Safely extract JSON from an AI response.

    Handles:
    - normal JSON
    - ```json ... ```
    - extra text around JSON
    """

    if not text:

        raise json.JSONDecodeError(
            "Empty AI response",
            "",
            0
        )

    cleaned = text.strip()

    # Remove markdown code fences
    cleaned = cleaned.replace("```json", "")
    cleaned = cleaned.replace("```", "")
    cleaned = cleaned.strip()

    # First attempt: direct JSON
    try:

        return json.loads(cleaned)

    except json.JSONDecodeError:

        pass

    # Second attempt: find JSON object
    start = cleaned.find("{")
    end = cleaned.rfind("}")

    if start != -1 and end != -1 and end > start:

        possible_json = cleaned[start:end + 1]

        return json.loads(possible_json)

    raise json.JSONDecodeError(
        "Could not find valid JSON",
        cleaned,
        0
    )


# =========================================================
# ERROR HANDLER - FILE TOO LARGE
# =========================================================

@app.errorhandler(413)
def file_too_large(error):

    return jsonify({

        "success": False,

        "error":
            "File is too large. Maximum allowed size is 10 MB.",

        "message":
            "File is too large. Maximum allowed size is 10 MB."

    }), 413


# =========================================================
# HOME
# =========================================================

@app.route("/")
def index():

    return render_template("index.html")


# =========================================================
# SYLLABUS PDF UPLOAD
# =========================================================

@app.route("/upload_syllabus", methods=["POST"])
def upload_syllabus():

    try:

        print("\n")
        print("========================================")
        print("         LEARNMIRROR AI")
        print("         SYLLABUS UPLOAD")
        print("========================================")

        # -----------------------------------------------------
        # GET FILE
        # -----------------------------------------------------

        file = request.files.get("syllabus")

        # Backward compatibility
        if file is None:

            file = request.files.get("file")

        # -----------------------------------------------------
        # NO FILE
        # -----------------------------------------------------

        if file is None:

            print("ERROR: No file uploaded.")

            return jsonify({

                "success": False,

                "error":
                    "No syllabus file uploaded.",

                "message":
                    "No syllabus file uploaded."

            }), 400

        # -----------------------------------------------------
        # EMPTY FILENAME
        # -----------------------------------------------------

        if not file.filename:

            print("ERROR: Empty filename.")

            return jsonify({

                "success": False,

                "error":
                    "No file selected.",

                "message":
                    "No file selected."

            }), 400

        # -----------------------------------------------------
        # FILE TYPE CHECK
        # -----------------------------------------------------

        if not allowed_file(file.filename):

            print(
                "ERROR: Invalid file type:",
                file.filename
            )

            return jsonify({

                "success": False,

                "error":
                    "Only PDF files are allowed.",

                "message":
                    "Only PDF files are allowed."

            }), 400

        # -----------------------------------------------------
        # SECURE FILENAME
        # -----------------------------------------------------

        original_filename = secure_filename(
            file.filename
        )

        if not original_filename:

            return jsonify({

                "success": False,

                "error":
                    "Invalid filename.",

                "message":
                    "Invalid filename."

            }), 400

        # -----------------------------------------------------
        # UNIQUE FILENAME
        # -----------------------------------------------------

        name, extension = os.path.splitext(
            original_filename
        )

        unique_filename = (
            f"{name}_{uuid.uuid4().hex[:8]}{extension}"
        )

        filepath = os.path.join(
            app.config["UPLOAD_FOLDER"],
            unique_filename
        )

        # -----------------------------------------------------
        # SAVE FILE
        # -----------------------------------------------------

        file.save(filepath)

        print(
            "Original file :",
            original_filename
        )

        print(
            "Saved file    :",
            unique_filename
        )

        print(
            "Location      :",
            filepath
        )

        print("----------------------------------------")
        print("Extracting PDF text...")

        # -----------------------------------------------------
        # PDF EXTRACTION
        # -----------------------------------------------------

        extracted_pages = []

        with open(filepath, "rb") as pdf_file:

            reader = PyPDF2.PdfReader(
                pdf_file
            )

            total_pages = len(
                reader.pages
            )

            print(
                "Total pages   :",
                total_pages
            )

            if total_pages == 0:

                return jsonify({

                    "success": False,

                    "error":
                        "The PDF contains no pages.",

                    "message":
                        "The PDF contains no pages."

                }), 400

            for page_number, page in enumerate(
                reader.pages,
                start=1
            ):

                print(
                    f"Reading page "
                    f"{page_number}/{total_pages}"
                )

                try:

                    text = page.extract_text()

                except Exception as page_error:

                    print(
                        f"Page {page_number} "
                        f"extraction error:",
                        str(page_error)
                    )

                    text = ""

                if text:

                    text = text.strip()

                    if text:

                        extracted_pages.append(
                            text
                        )

        # -----------------------------------------------------
        # COMBINE TEXT
        # -----------------------------------------------------

        extracted_text = "\n\n".join(
            extracted_pages
        ).strip()

        # -----------------------------------------------------
        # NO TEXT FOUND
        # -----------------------------------------------------

        if not extracted_text:

            print("----------------------------------------")
            print(
                "ERROR: No text could be extracted."
            )
            print(
                "The PDF may be scanned/image based."
            )
            print("========================================")

            return jsonify({

                "success": False,

                "error":
                    "Could not extract text from this PDF. "
                    "The PDF may be scanned/image based. "
                    "Please upload a text-based PDF.",

                "message":
                    "Could not extract text from this PDF. "
                    "The PDF may be scanned/image based. "
                    "Please upload a text-based PDF."

            }), 400

        # -----------------------------------------------------
        # SUCCESS
        # -----------------------------------------------------

        print("----------------------------------------")
        print("PDF extraction successful.")

        print(
            "Characters extracted:",
            len(extracted_text)
        )

        print(
            "Pages with text     :",
            len(extracted_pages)
        )

        print("========================================")
        print()

        return jsonify({

            "success": True,

            # Return original name to frontend
            "filename":
                original_filename,

            # Extracted syllabus text
            "text":
                extracted_text,

            "message":
                "Syllabus extracted successfully!"

        })

    # ---------------------------------------------------------
    # PDF ERROR
    # ---------------------------------------------------------

    except PyPDF2.errors.PdfReadError as e:

        print("\nPDF READ ERROR:")
        print(str(e))

        return jsonify({

            "success": False,

            "error":
                "Unable to read this PDF. "
                "The file may be corrupted or invalid.",

            "message":
                "Unable to read this PDF. "
                "The file may be corrupted or invalid."

        }), 400

    # ---------------------------------------------------------
    # GENERAL ERROR
    # ---------------------------------------------------------

    except Exception as e:

        print("\nUPLOAD ERROR:")
        print(type(e).__name__)
        print(str(e))
        print()

        return jsonify({

            "success": False,

            "error":
                str(e),

            "message":
                str(e)

        }), 500


# =========================================================
# AI TUTOR
# =========================================================

@app.route("/ask_tutor", methods=["POST"])
def ask_tutor():

    try:

        # -----------------------------------------------------
        # GET JSON DATA
        # -----------------------------------------------------

        data = request.get_json(
            silent=True
        )

        if not data:

            return jsonify({

                "success": False,

                "error":
                    "No request data received."

            }), 400

        # -----------------------------------------------------
        # GET TOPIC
        # -----------------------------------------------------

        topic = str(
            data.get("topic", "")
        ).strip()

        # -----------------------------------------------------
        # GET QUESTION
        # -----------------------------------------------------

        question = str(
            data.get("question", "")
        ).strip()

        # -----------------------------------------------------
        # VALIDATE TOPIC
        # -----------------------------------------------------

        if not topic:

            return jsonify({

                "success": False,

                "error":
                    "Please select a topic first."

            }), 400

        # -----------------------------------------------------
        # VALIDATE QUESTION
        # -----------------------------------------------------

        if not question:

            return jsonify({

                "success": False,

                "error":
                    "Please enter a question."

            }), 400

        # =====================================================
        # TUTOR PROMPT
        # =====================================================

        prompt = f"""
You are LearnMirror AI Tutor.

Your purpose is to help a student understand an academic
topic clearly.

Selected Topic:
{topic}

Student Question:
{question}

Instructions:

1. Explain the concept clearly and simply.

2. Use beginner-friendly language.

3. Give a small example when useful.

4. Keep the answer focused.

5. Focus mainly on the selected topic.

6. If the student asks for code, provide a simple
   understandable example.

7. Explain difficult terms when necessary.

8. Encourage understanding instead of memorization.

9. If the question is unclear, explain the most likely
   interpretation.

10. Do not unnecessarily repeat the question.

Answer the student's question now.
"""

        # =====================================================
        # CONSOLE LOG
        # =====================================================

        print("\n")
        print("========================================")
        print("        LEARNMIRROR AI TUTOR")
        print("========================================")
        print("AI Engine :", "Gemini")
        print("Topic     :", topic)
        print("Question  :", question)
        print("AI Model  :", GEMINI_MODEL)
        print("========================================")

        # =====================================================
        # GEMINI REQUEST
        # =====================================================

        answer = call_gemini(
            prompt
        )

        # -----------------------------------------------------
        # EMPTY RESPONSE
        # -----------------------------------------------------

        if not answer:

            return jsonify({

                "success": False,

                "error":
                    "Gemini returned an empty response."

            }), 500

        # -----------------------------------------------------
        # SUCCESS
        # -----------------------------------------------------

        return jsonify({

            "success": True,

            "answer":
                answer

        })

    # =========================================================
    # GENERAL ERROR
    # =========================================================

    except GeminiServiceError as e:

        print("\nAI TUTOR SERVICE ERROR:")
        print(str(e))

        return jsonify({
            "success": False,
            "error": str(e),
            "message": str(e)
        }), 503

    except Exception as e:

        print("\nAI TUTOR ERROR:")
        print(type(e).__name__)
        print(str(e))

        return jsonify({
            "success": False,
            "error":
                "The AI Tutor could not process your request. "
                "Please try again."
        }), 500


# =========================================================
# AI UNDERSTANDING EVALUATION
# =========================================================

@app.route(
    "/evaluate_understanding",
    methods=["POST"]
)
def evaluate_understanding():

    try:

        # =====================================================
        # GET DATA
        # =====================================================

        data = request.get_json(
            silent=True
        )

        if not data:

            return jsonify({

                "success": False,

                "error":
                    "No evaluation data received."

            }), 400

        # =====================================================
        # GET TOPIC
        # =====================================================

        topic = str(
            data.get("topic", "")
        ).strip()

        # =====================================================
        # GET EXPLANATION
        # =====================================================

        explanation = str(
            data.get("explanation", "")
        ).strip()

        # =====================================================
        # VALIDATION
        # =====================================================

        if not topic:

            return jsonify({

                "success": False,

                "error":
                    "No topic selected."

            }), 400

        if not explanation:

            return jsonify({

                "success": False,

                "error":
                    "Please explain the topic before evaluation."

            }), 400

        # =====================================================
        # WORD COUNT
        # =====================================================

        word_count = len(
            explanation.split()
        )

        # =====================================================
        # EMPTY / MEANINGLESS ANSWER
        # =====================================================

        if word_count < 3:

            return jsonify({

                "success": True,

                "concept_accuracy":
                    0,

                "recall":
                    0,

                "application":
                    0,

                "explanation_depth":
                    0,

                "overall_score":
                    0,

                "feedback":
                    "Please provide a meaningful explanation "
                    "of the selected topic.",

                "unlock":
                    False

            })

        # =====================================================
        # TOPIC RELEVANCE CHECK
        # =====================================================

        relevance_prompt = f"""
You are the relevance checker for LearnMirror AI.

Your ONLY job is to determine whether the student's answer
is meaningfully related to the selected academic topic.

SELECTED TOPIC:
{topic}

STUDENT ANSWER:
{explanation}

STRICT RULES:

1. The answer MUST actually discuss the selected topic.

2. The answer must contain meaningful academic information
   related to the selected topic.

3. Gibberish, random letters, random words, repeated words,
   meaningless text, or keyboard typing must be considered
   NOT RELATED.

4. A very short answer can be related if it contains a correct
   and meaningful concept from the selected topic.

5. Do NOT judge based only on the number of words.

6. Do NOT give credit for generic academic words.

7. The answer must demonstrate at least some actual knowledge
   of the selected topic.

8. If the answer is about another topic, mark it NOT RELATED.

9. If the answer is uncertain, vague, or does not demonstrate
   meaningful knowledge of the selected topic, mark it
   NOT RELATED.

10. The answer does not need to use the exact textbook wording.

11. Closely related terminology, abbreviations, examples, or
    correct explanations should be accepted when they clearly
    refer to the selected topic.

Return ONLY valid JSON.

Return exactly:

{{
    "relevant": true
}}

or

{{
    "relevant": false
}}
"""

        # =====================================================
        # SEND RELEVANCE CHECK TO GEMINI
        # =====================================================

        try:

            relevance_text = call_gemini(
                relevance_prompt
            )

            print("\n")
            print("========================================")
            print("       LEARNMIRROR RELEVANCE CHECK")
            print("========================================")
            print("AI Engine:", "Gemini")
            print("Model:", GEMINI_MODEL)
            print("Topic:", topic)
            print("Words:", word_count)
            print(
                "Raw response:",
                relevance_text
            )
            print("========================================")

            relevance_data = extract_json_from_ai(
                relevance_text
            )

            relevant = bool(
                relevance_data.get(
                    "relevant",
                    False
                )
            )

        except Exception as e:

            print(
                "\nRELEVANCE CHECK ERROR:"
            )

            print(
                type(e).__name__
            )

            print(
                str(e)
            )

            # Fail safely:
            # If relevance cannot be verified,
            # do not generate an Understanding Report.

            return jsonify({

                "success": False,

                "relevant":
                    False,

                "report_available":
                    False,

                "error":
                    "Unable to verify whether the answer is related "
                    "to the selected topic. Please try again."

            }), 500

        # =====================================================
        # STOP IF ANSWER IS NOT RELATED
        # =====================================================

        if not relevant:

            print("\n")
            print("========================================")
            print("       ANSWER NOT RELATED")
            print("========================================")
            print("Topic:", topic)
            print("No understanding score generated.")
            print("========================================")
            print()

            return jsonify({

                "success": True,

                "relevant":
                    False,

                "report_available":
                    False,

                "concept_accuracy":
                    None,

                "recall":
                    None,

                "application":
                    None,

                "explanation_depth":
                    None,

                "overall_score":
                    None,

                "unlock":
                    False,

                "message":
                    "Your answer is not related to the selected topic.",

                "error":
                    "Please explain the selected topic in your own words "
                    "to receive your Understanding Report."

            })

        # =====================================================
        # LEARNMIRROR UNDERSTANDING EVALUATOR
        # =====================================================

        prompt = f"""
You are LearnMirror AI, an academic understanding evaluator.

Evaluate the student's Teach-Back explanation of the
selected academic topic.

Your PRIMARY goal is to determine whether the student
actually understands the topic.

=========================================================
SELECTED TOPIC
=========================================================

{topic}

=========================================================
STUDENT ANSWER
=========================================================

{explanation}

=========================================================
VERY IMPORTANT SCORING PHILOSOPHY
=========================================================

CORRECTNESS IS MORE IMPORTANT THAN LENGTH.

Do NOT give marks because the student wrote many words.

Do NOT reduce marks simply because the student wrote
a concise answer.

A short but correct explanation can receive 80% or higher
when it demonstrates strong understanding of the core topic.

A long answer should NOT receive a high score merely because
it contains many words.

Repetition does not increase marks.

Irrelevant information does not increase marks.

Incorrect information should reduce the score.

=========================================================
STEP 1 — RELEVANCE
=========================================================

Determine whether the student actually explains the selected
topic.

If the answer is:

- gibberish
- meaningless
- completely unrelated
- random text
- only repeated words
- about another topic

then all scores must be 0.

=========================================================
STEP 2 — CONCEPT ACCURACY
=========================================================

This is the MOST IMPORTANT category.

Score 0-100.

Evaluate:

- correct definitions
- correct concepts
- factual correctness
- correct terminology
- absence of misconceptions
- understanding of the main idea

Scoring:

0-20   = no meaningful understanding
21-40  = very weak understanding
41-60  = basic/incomplete understanding
61-79  = mostly correct
80-89  = strong understanding
90-100 = excellent understanding

IMPORTANT:

If the student correctly explains the MAIN concept
in their own words, Concept Accuracy should be high.

Do not demand textbook wording.

=========================================================
STEP 3 — RECALL / IMPORTANT POINTS
=========================================================

Score 0-100.

Evaluate whether the student remembers the important
points of the topic.

Consider:

- definitions
- features
- characteristics
- components
- principles
- syntax where relevant
- important properties
- terminology
- major points

Do NOT require every minor textbook detail.

If the student covers the main important points,
give a strong Recall score.

=========================================================
STEP 4 — APPLICATION
=========================================================

Score 0-100.

Look for:

- examples
- practical uses
- real-world applications
- where it is used
- how it is used

BUT:

Application must NOT heavily punish a correct theoretical
answer.

Some academic topics are mainly theoretical.

If the student correctly explains the topic but does not
give a real-world application, Concept Accuracy and Recall
can still be high.

Do NOT make Application mandatory for every topic.

If the student gives a correct example/program, reward it.

=========================================================
STEP 5 — EXPLANATION QUALITY
=========================================================

Score 0-100.

Evaluate:

- clarity
- logical flow
- own-word explanation
- meaningful detail
- relationship between concepts
- reasoning
- understandable presentation

Do NOT use word count as the main factor.

A 150-word excellent explanation can score higher than
an 800-word poor explanation.

=========================================================
STEP 6 — LENGTH
=========================================================

Word count is INFORMATION ONLY.

Never give marks simply because an answer is long.

Never automatically reduce marks because an answer is short.

Judge the actual knowledge demonstrated.

=========================================================
STEP 7 — SCORE CALCULATION
=========================================================

Use this scoring structure:

Concept Accuracy = 50%
Recall = 30%
Explanation Quality = 20%

Application is treated as a SUPPORTING factor rather than
a major penalty.

Calculate the BASE SCORE:

Base Score =
(
    Concept Accuracy * 0.50
    +
    Recall * 0.30
    +
    Explanation Quality * 0.20
)

Then consider Application.

Application should only improve the result when the student
actually demonstrates useful application or examples.

Application should NOT significantly reduce an otherwise
correct theoretical explanation.

=========================================================
SCORE CALIBRATION
=========================================================

If the student:

- correctly understands the main concept
- covers most important points
- explains clearly
- has no major misconceptions

then the score should generally be capable of reaching
80% or higher.

For example:

Concept Accuracy = 85
Recall = 80
Explanation Quality = 80

Base Score:

85 * 0.50 = 42.5
80 * 0.30 = 24
80 * 0.20 = 16

Base Score = 82.5

This should result in approximately 83%.

Even if Application is low, DO NOT destroy this score.

=========================================================
EXAMPLE
=========================================================

Topic:

Array of Objects in C++

If the student correctly explains:

- what an array of objects is
- why it is used
- object creation
- syntax
- accessing objects
- example program
- important characteristics

then the answer should be considered a strong
understanding even if no real-world application is given.

=========================================================
WRONG ANSWER
=========================================================

If the student writes 800 words but contains:

- incorrect definitions
- unrelated content
- repeated content
- misconceptions

then do NOT give 80+ merely because of the word count.

=========================================================
FEEDBACK
=========================================================

Give specific feedback.

Mention:

1. What was explained correctly.
2. Important points successfully covered.
3. Missing important concepts.
4. What can be improved.

Do not criticize the student simply because the answer
is short.

For a strong answer, explicitly acknowledge that the
student demonstrated good conceptual understanding.

=========================================================
OUTPUT
=========================================================

Return ONLY valid JSON.

Do NOT use markdown.

Do NOT use ```json.

Do NOT write anything outside JSON.

Return exactly:

{{
    "concept_accuracy": 0,
    "recall": 0,
    "application": 0,
    "explanation_depth": 0,
    "feedback": "Specific feedback."
}}

All scores must be integers from 0 to 100.
"""

        # =====================================================
        # SEND TO GEMINI
        # =====================================================

        print("\n")
        print("========================================")
        print("     LEARNMIRROR UNDERSTANDING AI")
        print("========================================")
        print("AI Engine : Gemini")
        print("Model     :", GEMINI_MODEL)
        print("Topic     :", topic)
        print("Words     :", word_count)
        print("----------------------------------------")
        print("SCORING WEIGHTS")
        print("Concept Accuracy : 50%")
        print("Recall           : 30%")
        print("Explanation      : 20%")
        print("Application      : Supporting")
        print("========================================")

        ai_text = call_gemini(
            prompt
        )

        print("\nRAW AI RESPONSE:")
        print(ai_text)
        print()

        # =====================================================
        # EMPTY AI RESPONSE
        # =====================================================

        if not ai_text:

            return jsonify({

                "success": False,

                "error":
                    "Gemini returned an empty evaluation."

            }), 500

        # =====================================================
        # PARSE JSON
        # =====================================================

        evaluation = extract_json_from_ai(
            ai_text
        )

        if not isinstance(
            evaluation,
            dict
        ):

            raise json.JSONDecodeError(
                "AI evaluation is not a JSON object.",
                ai_text,
                0
            )

        # =====================================================
        # GET SCORES
        # =====================================================

        concept_accuracy = safe_score(
            evaluation.get(
                "concept_accuracy",
                0
            )
        )

        recall = safe_score(
            evaluation.get(
                "recall",
                0
            )
        )

        application = safe_score(
            evaluation.get(
                "application",
                0
            )
        )

        explanation_depth = safe_score(
            evaluation.get(
                "explanation_depth",
                0
            )
        )

        # =====================================================
        # FINAL SCORE
        # =====================================================

        # Concept Accuracy = 50%
        # Recall           = 30%
        # Explanation      = 20%
        # Application      = Supporting bonus

        base_score = (

            (concept_accuracy * 0.50)

            +

            (recall * 0.30)

            +

            (explanation_depth * 0.20)

        )

        # =====================================================
        # APPLICATION BONUS
        # =====================================================

        application_bonus = 0

        if application >= 80:

            application_bonus = 5

        elif application >= 60:

            application_bonus = 3

        elif application >= 40:

            application_bonus = 1

        else:

            application_bonus = 0

        # =====================================================
        # CALCULATE OVERALL SCORE
        # =====================================================

        overall_score = round(
            base_score + application_bonus
        )

        overall_score = max(
            0,
            min(
                100,
                overall_score
            )
        )

        # =====================================================
        # IMPORTANT SCORE BOOST
        # =====================================================

        # Strong conceptual understanding should be capable
        # of reaching 80+ even when application is low.

        if (

            concept_accuracy >= 85

            and

            recall >= 80

            and

            explanation_depth >= 75

        ):

            if overall_score < 80:

                overall_score = 80

        # =====================================================
        # STRONG CONCEPTUAL ANSWER
        # =====================================================

        if (

            concept_accuracy >= 90

            and

            recall >= 80

            and

            explanation_depth >= 80

        ):

            if overall_score < 85:

                overall_score = 85

        # =====================================================
        # UNLOCK
        # =====================================================

        unlock = (
            overall_score >= 80
        )

        # =====================================================
        # FEEDBACK
        # =====================================================

        feedback = evaluation.get(

            "feedback",

            "Review the topic and try explaining it again."

        )

        if not isinstance(
            feedback,
            str
        ):

            feedback = str(
                feedback
            )

        feedback = feedback.strip()

        if not feedback:

            feedback = (
                "Review the topic and try explaining it again."
            )

        # =====================================================
        # CONSOLE RESULT
        # =====================================================

        print("========================================")
        print("        FINAL EVALUATION")
        print("========================================")

        print(
            "Concept Accuracy :",
            concept_accuracy
        )

        print(
            "Recall           :",
            recall
        )

        print(
            "Application      :",
            application
        )

        print(
            "Explanation      :",
            explanation_depth
        )

        print(
            "Base Score       :",
            round(base_score, 2)
        )

        print(
            "Application Bonus:",
            application_bonus
        )

        print(
            "FINAL SCORE      :",
            overall_score
        )

        print(
            "UNLOCK           :",
            unlock
        )

        print("========================================")
        print()

        # =====================================================
        # RESPONSE TO JAVASCRIPT
        # =====================================================

        return jsonify({

            "success":
                True,

            "concept_accuracy":
                concept_accuracy,

            "recall":
                recall,

            "application":
                application,

            "explanation_depth":
                explanation_depth,

            "overall_score":
                overall_score,

            "feedback":
                feedback,

            "unlock":
                unlock

        })

    # =========================================================
    # INVALID JSON
    # =========================================================

    except json.JSONDecodeError:

        print(
            "\nERROR: Gemini returned invalid JSON."
        )

        return jsonify({

            "success":
                False,

            "error":
                "AI returned an invalid evaluation format. "
                "Please try again."

        }), 500

    # =========================================================
    # GENERAL ERROR
    # =========================================================

    except GeminiServiceError as e:

        print("\nUNDERSTANDING AI SERVICE ERROR:")
        print(str(e))

        return jsonify({
            "success": False,
            "report_available": False,
            "error": str(e),
            "message": str(e)
        }), 503

    except Exception as e:

        print("\nUNDERSTANDING EVALUATION ERROR:")
        print(type(e).__name__)
        print(str(e))

        return jsonify({
            "success": False,
            "report_available": False,
            "error":
                "The understanding evaluation could not be completed. "
                "Please try again."
        }), 500


# =========================================================
# RUN FLASK SERVER
# =========================================================

if __name__ == "__main__":

    print("\n")
    print("========================================")
    print("          LEARNMIRROR AI")
    print("========================================")
    print("AI Engine : Gemini")
    print("AI Model  :", GEMINI_MODEL)
    print("PDF Tool  : PyPDF2")
    print("Evaluation: Concept Focused")
    print("Upload    : PDF only")
    print("Max File  : 10 MB")
    print("Server    : http://127.0.0.1:5000")
    print("========================================")
    print()

    app.run(
        host="0.0.0.0",
        port=int(os.environ.get("PORT", 5000)),
        debug=False
    )