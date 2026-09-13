from flask import Flask, render_template, request, jsonify
from werkzeug.utils import secure_filename

import os
import PyPDF2


app = Flask(__name__)


# ==========================================
# CONFIGURATION
# ==========================================

UPLOAD_FOLDER = "uploads"

ALLOWED_EXTENSIONS = {"pdf"}

app.config["UPLOAD_FOLDER"] = UPLOAD_FOLDER

os.makedirs(UPLOAD_FOLDER, exist_ok=True)


# ==========================================
# CHECK FILE TYPE
# ==========================================

def allowed_file(filename):

    return (
        "." in filename
        and filename.rsplit(".", 1)[1].lower()
        in ALLOWED_EXTENSIONS
    )


# ==========================================
# HOME PAGE
# ==========================================

@app.route("/")
def home():

    return render_template("index.html")


# ==========================================
# PDF UPLOAD AND TEXT EXTRACTION
# ==========================================

@app.route("/upload_syllabus", methods=["POST"])
def upload_syllabus():

    print("\n================================")
    print("PDF UPLOAD REQUEST RECEIVED")
    print("================================")


    # Check file exists

    if "file" not in request.files:

        print("ERROR: File not received")

        return jsonify({
            "success": False,
            "message": "No file received by server."
        })


    file = request.files["file"]


    # Check filename

    if file.filename == "":

        print("ERROR: No file selected")

        return jsonify({
            "success": False,
            "message": "No file selected."
        })


    # Check extension

    if not allowed_file(file.filename):

        print("ERROR: Invalid file type")

        return jsonify({
            "success": False,
            "message": "Please upload only a PDF file."
        })


    # ==========================================
    # SAVE PDF
    # ==========================================

    filename = secure_filename(file.filename)

    filepath = os.path.join(
        app.config["UPLOAD_FOLDER"],
        filename
    )


    file.save(filepath)


    print("PDF SAVED SUCCESSFULLY")
    print("FILE PATH:", filepath)



    # ==========================================
    # EXTRACT PDF TEXT
    # ==========================================

    extracted_text = ""


    try:


        with open(filepath, "rb") as pdf_file:


            reader = PyPDF2.PdfReader(pdf_file)


            print("TOTAL PAGES:", len(reader.pages))


            for i, page in enumerate(reader.pages):


                print(
                    f"READING PAGE {i + 1}..."
                )


                page_text = page.extract_text()


                if page_text:

                    extracted_text += (
                        page_text + "\n"
                    )



        print("================================")

        print(
            "TOTAL CHARACTERS EXTRACTED:",
            len(extracted_text)
        )

        print("================================")



    except Exception as e:


        print("PDF EXTRACTION ERROR:")
        print(str(e))


        return jsonify({

            "success": False,

            "message":
                "Error reading PDF: " + str(e)

        })



    # ==========================================
    # CHECK TEXT
    # ==========================================

    if not extracted_text.strip():


        print(
            "NO TEXT COULD BE EXTRACTED"
        )


        return jsonify({

            "success": False,

            "message":
                "No text found in this PDF. It may be a scanned/image PDF."

        })



    # ==========================================
    # SUCCESS RESPONSE
    # ==========================================

    print("PDF TEXT EXTRACTION SUCCESSFUL")


    return jsonify({

        "success": True,

        "text": extracted_text,

        "message":
            "Syllabus extracted successfully!"

    })



# ==========================================
# RUN APPLICATION
# ==========================================

if __name__ == "__main__":

    app.run(
        debug=True,
        use_reloader=False
    )