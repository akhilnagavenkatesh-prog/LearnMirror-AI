/* =========================================
   LEARNMIRROR AI - SCRIPT.JS
========================================= */


/* =========================================
   GLOBAL VARIABLES
========================================= */

let topics = [];

let currentTopicIndex = 0;

let recognition = null;

let isRecording = false;


/* =========================================
   UPLOAD SYLLABUS
========================================= */

async function uploadSyllabus() {

    const fileInput =
        document.getElementById("syllabusFile");

    const syllabusText =
        document.getElementById("syllabusText");

    const fileName =
        document.getElementById("fileName");

    const uploadStatus =
        document.getElementById("uploadStatus");


    if (!fileInput.files.length) {

        return;

    }


    const file = fileInput.files[0];


    /* Show file name */

    fileName.innerText =
        "📄 Selected: " + file.name;


    uploadStatus.innerText =
        "⏳ Extracting syllabus content...";


    const formData = new FormData();

    formData.append("file", file);


    try {

        const response =
            await fetch("/upload_syllabus", {

                method: "POST",

                body: formData

            });


        const data =
            await response.json();


        if (data.success) {

            syllabusText.value =
                data.text;


            uploadStatus.innerText =
                "✅ Syllabus extracted successfully!";


        } else {

            uploadStatus.innerText =
                "❌ " + data.message;

        }


    } catch (error) {

        console.error(error);

        uploadStatus.innerText =
            "❌ Error uploading file. Please try again.";

    }

}


/* =========================================
   GENERATE STUDY PLAN
========================================= */

function generatePlan() {

    const course =
        document.getElementById("course").value.trim();

    const semester =
        document.getElementById("semester").value.trim();

    const syllabus =
        document.getElementById("syllabusText").value.trim();

    const examDate =
        document.getElementById("examDate").value;

    const studyTime =
        document.getElementById("studyTime").value;


    /* Validation */

    if (syllabus === "") {

        alert(
            "Please type your syllabus or upload a syllabus file first!"
        );

        return;

    }


    if (examDate === "") {

        alert(
            "Please select your exam date!"
        );

        return;

    }


    if (studyTime === "") {

        alert(
            "Please enter your daily study time!"
        );

        return;

    }


    /* =====================================
       EXTRACT TOPICS
    ===================================== */

    topics = extractTopics(syllabus);


    if (topics.length === 0) {

        alert(
            "Could not identify topics. Please enter the syllabus clearly."
        );

        return;

    }


    currentTopicIndex = 0;


    /* =====================================
       CALCULATE DAYS
    ===================================== */

    const today =
        new Date();

    const exam =
        new Date(examDate);


    const difference =
        exam - today;


    let daysRemaining =
        Math.ceil(
            difference /
            (1000 * 60 * 60 * 24)
        );


    if (daysRemaining < 1) {

        daysRemaining = 1;

    }


    /* =====================================
       CREATE PLAN SUMMARY
    ===================================== */

    const planSummary =
        document.getElementById("planSummary");


    planSummary.innerHTML = `

        <div class="plan-summary-box">

            <h3>🎯 Your Smart Learning Plan</h3>

            <p>
                <b>Course:</b>
                ${course || "Not specified"}
            </p>

            <p>
                <b>Semester:</b>
                ${semester || "Not specified"}
            </p>

            <p>
                <b>Topics Found:</b>
                ${topics.length}
            </p>

            <p>
                <b>Days Remaining:</b>
                ${daysRemaining}
            </p>

            <p>
                <b>Daily Study Time:</b>
                ${studyTime} hours
            </p>

        </div>

    `;


    /* =====================================
       CREATE DAILY PLAN
    ===================================== */

    const planOutput =
        document.getElementById("planOutput");


    planOutput.innerHTML = "";


    topics.forEach(function(topic, index) {

        const day =
            Math.floor(
                index / Math.max(
                    1,
                    Math.ceil(
                        topics.length / daysRemaining
                    )
                )
            ) + 1;


        planOutput.innerHTML += `

            <div
                class="day-card"
                onclick="selectTopic(${index})"
                style="cursor: pointer;"
            >

                <h3>
                    📅 Day ${day}
                </h3>

                <h4>
                    📚 ${topic}
                </h4>

                <ul>

                    <li>
                        Learn the concept carefully
                    </li>

                    <li>
                        Understand important points
                    </li>

                    <li>
                        Explain it in your own words
                    </li>

                    <li>
                        Get 80%+ to unlock the next topic
                    </li>

                </ul>

            </div>

        `;

    });


    /* =====================================
       LOAD FIRST TOPIC
    ===================================== */

    selectTopic(0);


    /* Scroll */

    planSummary.scrollIntoView({

        behavior: "smooth",

        block: "start"

    });

}


/* =========================================
   EXTRACT TOPICS FROM SYLLABUS
========================================= */

function extractTopics(syllabus) {

    const lines =
        syllabus
            .split("\n")
            .map(function(line) {

                return line.trim();

            })
            .filter(function(line) {

                return line.length > 0;

            });


    const extractedTopics = [];


    lines.forEach(function(line) {

        const lowerLine =
            line.toLowerCase();


        /* Skip UNIT headings */

        if (
            lowerLine.startsWith("unit ") ||
            lowerLine.startsWith("chapter ") ||
            lowerLine.startsWith("module ")
        ) {

            return;

        }


        /* Remove numbering */

        const cleanTopic =
            line.replace(
                /^[0-9]+[.)\-\s]+/,
                ""
            ).trim();


        if (
            cleanTopic.length > 2 &&
            cleanTopic.length < 120
        ) {

            extractedTopics.push(cleanTopic);

        }

    });


    /* Remove duplicates */

    return [
        ...new Set(extractedTopics)
    ];

}


/* =========================================
   SELECT TOPIC
========================================= */

function selectTopic(index) {

    if (
        index < 0 ||
        index >= topics.length
    ) {

        return;

    }


    currentTopicIndex = index;


    const topic =
        topics[currentTopicIndex];


    const learnContent =
        document.getElementById("learnContent");


    learnContent.innerHTML = `

        <h3>
            📚 ${topic}
        </h3>

        <p>

            Study this topic carefully.

            Understand the main concepts,
            important definitions, differences,
            features and applications.

        </p>

        <br>

        <p>

            💡 After learning, explain this topic
            in your own words using the
            <b>Teach Back</b> section.

        </p>

        <br>

        <p>

            🎯 Score <b>80% or above</b>
            to unlock the next topic.

        </p>

    `;


    /* Clear old explanation */

    document.getElementById("explanation").value = "";


    /* Reset report */

    document.getElementById("report").innerHTML = `

        <div class="report-placeholder">

            <p>
                Explain the topic and click
                "Evaluate My Understanding".
            </p>

        </div>

    `;


    learnContent.scrollIntoView({

        behavior: "smooth",

        block: "center"

    });

}


/* =========================================
   START VOICE RECOGNITION
========================================= */

function startVoiceRecognition() {

    const SpeechRecognition =
        window.SpeechRecognition ||
        window.webkitSpeechRecognition;


    if (!SpeechRecognition) {

        alert(
            "Voice recognition is not supported in this browser. Please use Google Chrome."
        );

        return;

    }


    /* If already recording */

    if (isRecording) {

        return;

    }


    recognition =
        new SpeechRecognition();


    /* IMPORTANT SETTINGS */

    recognition.continuous = true;

    recognition.interimResults = true;

    recognition.lang = "en-IN";


    isRecording = true;


    const explanation =
        document.getElementById("explanation");

    const voiceStatus =
        document.getElementById("voiceStatus");


    voiceStatus.innerText =
        "🔴 Listening... Speak freely. You can pause between sentences.";


    /* =====================================
       VOICE RESULT
    ===================================== */

    recognition.onresult =
        function(event) {

            let finalTranscript = "";

            let interimTranscript = "";


            for (
                let i = event.resultIndex;
                i < event.results.length;
                i++
            ) {

                const transcript =
                    event.results[i][0].transcript;


                if (
                    event.results[i].isFinal
                ) {

                    finalTranscript +=
                        transcript + " ";

                }

                else {

                    interimTranscript +=
                        transcript;

                }

            }


            /* Add final voice text */

            if (finalTranscript !== "") {

                explanation.value +=
                    finalTranscript;

            }


            /* Show current speech */

            if (interimTranscript !== "") {

                voiceStatus.innerText =
                    "🔴 Listening: " +
                    interimTranscript;

            }

            else {

                voiceStatus.innerText =
                    "🔴 Listening...";

            }

        };


    /* =====================================
       ERROR HANDLING
    ===================================== */

    recognition.onerror =
        function(event) {

            console.log(
                "Speech recognition error:",
                event.error
            );


            if (
                event.error === "not-allowed" ||
                event.error === "service-not-allowed"
            ) {

                isRecording = false;


                voiceStatus.innerText =
                    "❌ Microphone permission denied.";

            }


            if (
                event.error === "no-speech"
            ) {

                console.log(
                    "No speech detected. Restarting..."
                );

            }

        };


    /* =====================================
       AUTO RESTART
       IMPORTANT FOR PAUSES
    ===================================== */

    recognition.onend =
        function() {

            if (isRecording) {

                setTimeout(
                    function() {

                        try {

                            recognition.start();

                        }

                        catch (error) {

                            console.log(error);

                        }

                    },
                    300
                );

            }

        };


    /* Start recognition */

    try {

        recognition.start();

    }

    catch (error) {

        console.log(error);

    }

}


/* =========================================
   STOP VOICE RECOGNITION
========================================= */

function stopVoiceRecognition() {

    isRecording = false;


    if (recognition) {

        try {

            recognition.stop();

        }

        catch (error) {

            console.log(error);

        }

    }


    document.getElementById("voiceStatus").innerText =
        "✅ Speaking stopped. Your explanation is ready for evaluation.";

}


/* =========================================
   EVALUATE EXPLANATION
========================================= */

function evaluateExplanation() {

    const explanation =
        document
            .getElementById("explanation")
            .value
            .trim();


    const report =
        document.getElementById("report");


    /* =====================================
       VALIDATION
    ===================================== */

    if (explanation === "") {

        alert(
            "Please explain the topic first!"
        );

        return;

    }


    /* =====================================
       WORD COUNT
    ===================================== */

    const words =
        explanation
            .split(/\s+/)
            .filter(function(word) {

                return word.length > 0;

            });


    const wordCount =
        words.length;


    /* =====================================
       CURRENT TOPIC
    ===================================== */

    let topic =
        "Current Topic";


    if (
        topics.length > 0 &&
        topics[currentTopicIndex]
    ) {

        topic =
            topics[currentTopicIndex];

    }


    const text =
        explanation.toLowerCase();


    /* =====================================
       KEYWORDS
    ===================================== */

    const conceptKeywords = [

        "definition",

        "concept",

        "meaning",

        "difference",

        "feature",

        "function",

        "programming",

        "language",

        "important",

        "process",

        "system"

    ];


    const recallKeywords = [

        "example",

        "first",

        "second",

        "also",

        "another",

        "uses",

        "used",

        "called",

        "such as",

        "includes"

    ];


    const applicationKeywords = [

        "application",

        "real world",

        "used for",

        "software",

        "development",

        "system",

        "program",

        "website",

        "example",

        "practical"

    ];


    const depthKeywords = [

        "because",

        "therefore",

        "whereas",

        "however",

        "for example",

        "in addition",

        "main difference",

        "advantage",

        "disadvantage",

        "important"

    ];


    /* =====================================
       COUNT KEYWORDS
    ===================================== */

    function countMatches(keywords) {

        let count = 0;


        keywords.forEach(function(keyword) {

            if (
                text.includes(keyword)
            ) {

                count++;

            }

        });


        return count;

    }


    const conceptMatches =
        countMatches(conceptKeywords);

    const recallMatches =
        countMatches(recallKeywords);

    const applicationMatches =
        countMatches(applicationKeywords);

    const depthMatches =
        countMatches(depthKeywords);


    /* =====================================
       IMPROVED SCORING SYSTEM
    ===================================== */


    let conceptAccuracy = 45;

    let recall = 45;

    let application = 40;

    let explanationDepth = 40;


    /* WORD COUNT BONUS */


    if (wordCount >= 20) {

        conceptAccuracy += 5;

        recall += 5;

    }


    if (wordCount >= 40) {

        conceptAccuracy += 5;

        explanationDepth += 10;

    }


    if (wordCount >= 60) {

        recall += 8;

        explanationDepth += 10;

    }


    /* 100 WORDS = GOOD EXPLANATION */


    if (wordCount >= 80) {

        conceptAccuracy += 8;

        recall += 8;

        application += 8;

        explanationDepth += 10;

    }


    if (wordCount >= 100) {

        conceptAccuracy += 10;

        recall += 10;

        application += 10;

        explanationDepth += 15;

    }


    if (wordCount >= 150) {

        conceptAccuracy += 5;

        recall += 5;

        application += 8;

        explanationDepth += 8;

    }


    if (wordCount >= 200) {

        explanationDepth += 5;

    }


    /* KEYWORD BONUS */


    conceptAccuracy +=
        conceptMatches * 3;


    recall +=
        recallMatches * 3;


    application +=
        applicationMatches * 4;


    explanationDepth +=
        depthMatches * 3;


    /* =====================================
       LIMIT SCORES
    ===================================== */

    conceptAccuracy =
        Math.min(
            Math.round(conceptAccuracy),
            100
        );


    recall =
        Math.min(
            Math.round(recall),
            100
        );


    application =
        Math.min(
            Math.round(application),
            100
        );


    explanationDepth =
        Math.min(
            Math.round(explanationDepth),
            100
        );


    /* =====================================
       OVERALL SCORE
    ===================================== */

    const score =
        Math.round(

            (
                conceptAccuracy +
                recall +
                application +
                explanationDepth
            ) / 4

        );


    /* =====================================
       REPORT HTML
    ===================================== */

    let reportHTML = `

        <div class="report-dashboard">


            <!-- OVERALL SCORE -->

            <div class="score-header">

                <div>

                    <div class="score-title">

                        OVERALL UNDERSTANDING SCORE

                    </div>


                    <div class="main-score">

                        ${score}%

                    </div>

                </div>

            </div>



            <!-- PROGRESS BAR -->

            <div class="main-progress">

                <div
                    class="main-progress-fill"
                    style="width: ${score}%"
                ></div>

            </div>



            <!-- CONCEPT ACCURACY -->

            <div class="attribute-row">

                <div class="attribute-name">

                    🎯 Concept Accuracy

                </div>


                <div class="attribute-bar">

                    <div
                        class="attribute-fill concept-fill"
                        style="width: ${conceptAccuracy}%"
                    ></div>

                </div>


                <div class="attribute-score">

                    ${conceptAccuracy}%

                </div>

            </div>



            <!-- RECALL -->

            <div class="attribute-row">

                <div class="attribute-name">

                    🧠 Recall

                </div>


                <div class="attribute-bar">

                    <div
                        class="attribute-fill recall-fill"
                        style="width: ${recall}%"
                    ></div>

                </div>


                <div class="attribute-score">

                    ${recall}%

                </div>

            </div>



            <!-- APPLICATION -->

            <div class="attribute-row">

                <div class="attribute-name">

                    ⚙️ Application

                </div>


                <div class="attribute-bar">

                    <div
                        class="attribute-fill application-fill"
                        style="width: ${application}%"
                    ></div>

                </div>


                <div class="attribute-score">

                    ${application}%

                </div>

            </div>



            <!-- EXPLANATION DEPTH -->

            <div class="attribute-row">

                <div class="attribute-name">

                    📖 Explanation Depth

                </div>


                <div class="attribute-bar">

                    <div
                        class="attribute-fill depth-fill"
                        style="width: ${explanationDepth}%"
                    ></div>

                </div>


                <div class="attribute-score">

                    ${explanationDepth}%

                </div>

            </div>



            <!-- TOPIC DETAILS -->

            <div class="report-topic">

                📚 <b>Topic:</b>
                ${topic}

                <br><br>

                📝 <b>Words Used:</b>
                ${wordCount}

            </div>

    `;


    /* =====================================
       SCORE FEEDBACK
    ===================================== */


    if (score >= 80) {

        reportHTML += `

            <div class="report-feedback">

                <h3>
                    🎉 Excellent Work!
                </h3>


                <p>

                    Great job! You have demonstrated
                    a strong understanding of this topic.

                </p>


                <p>

                    Your score is
                    <b>${score}%</b>.

                    The next topic is now unlocked! 🚀

                </p>


                <button
                    class="next-topic-btn"
                    onclick="goToNextTopic()"
                >

                    ➡️ Go to Next Topic

                </button>

            </div>

        `;

    }


    else if (score >= 60) {

        reportHTML += `

            <div class="report-feedback">

                <h3>
                    👍 Good Attempt!
                </h3>


                <p>

                    You have a basic understanding
                    of the topic.

                </p>


                <p>

                    Your score is
                    <b>${score}%</b>.

                </p>


                <p>

                    🎯 Add more concepts,
                    examples and practical applications
                    to reach <b>80%</b>.

                </p>

            </div>

        `;

    }


    else {

        reportHTML += `

            <div class="report-feedback">

                <h3>
                    📚 Keep Practicing!
                </h3>


                <p>

                    Your current score is
                    <b>${score}%</b>.

                </p>


                <p>

                    Review the topic again and explain
                    it with more important concepts
                    and examples.

                </p>


                <p>

                    🎯 You need at least
                    <b>80%</b> to unlock
                    the next topic.

                </p>

            </div>

        `;

    }


    /* Close dashboard */

    reportHTML += `

        </div>

    `;


    /* =====================================
       DISPLAY REPORT
    ===================================== */

    report.innerHTML =
        reportHTML;


    /* Scroll to report */

    report.scrollIntoView({

        behavior: "smooth",

        block: "center"

    });

}


/* =========================================
   GO TO NEXT TOPIC
========================================= */

function goToNextTopic() {

    if (
        currentTopicIndex <
        topics.length - 1
    ) {

        currentTopicIndex++;


        alert(
            "🎉 Congratulations! Moving to the next topic."
        );


        selectTopic(
            currentTopicIndex
        );

    }


    else {

        document
            .getElementById("learnContent")
            .innerHTML = `

                <h3>
                    🎉 Congratulations!
                </h3>

                <p>

                    You have completed all topics
                    in your current learning plan! 🚀

                </p>

            `;


        alert(
            "🎉 Congratulations! You completed all topics!"
        );

    }

}