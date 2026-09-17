/* =========================================================
   LEARNMIRROR AI - COMPLETE SCRIPT.JS
   =========================================================

   Features:
   1. PDF syllabus upload
   2. PDF text extraction through Flask
   3. Topic extraction
   4. Personalized day-wise learning plan
   5. 5 topics per row
   6. Topic selection
   7. Learning resources
   8. AI Tutor through Ollama + Flask
   9. Voice recognition
   10. Teach Back evaluation
   11. Understanding Report
   12. 80% next-topic unlock
   ========================================================= */


/* =========================================================
   GLOBAL VARIABLES
========================================================= */

let topics = [];

let currentTopicIndex = 0;

let recognition = null;

let isRecording = false;


/*
   Stores topics that have been unlocked.
   Topic 0 is unlocked automatically.
*/

let unlockedTopics = new Set([0]);


/* =========================================================
   PDF SYLLABUS UPLOAD
========================================================= */

async function uploadSyllabus() {

    const fileInput =
        document.getElementById("syllabusFile");

    const syllabusText =
        document.getElementById("syllabusText");

    const fileName =
        document.getElementById("fileName");

    const uploadStatus =
        document.getElementById("uploadStatus");


    /* -----------------------------------------------------
       CHECK INPUT
    ----------------------------------------------------- */

    if (!fileInput) {

        console.error(
            "❌ syllabusFile element not found."
        );

        return;
    }


    if (
        !fileInput.files ||
        fileInput.files.length === 0
    ) {

        return;
    }


    const file =
        fileInput.files[0];


    /* -----------------------------------------------------
       DEBUG
    ----------------------------------------------------- */

    console.log(
        "========================================"
    );

    console.log(
        "LEARNMIRROR AI - PDF UPLOAD"
    );

    console.log(
        "File:",
        file.name
    );

    console.log(
        "Type:",
        file.type
    );

    console.log(
        "Size:",
        file.size,
        "bytes"
    );

    console.log(
        "========================================"
    );


    /* -----------------------------------------------------
       CHECK PDF
    ----------------------------------------------------- */

    const isPDF =
        file.type === "application/pdf" ||
        file.name
            .toLowerCase()
            .endsWith(".pdf");


    if (!isPDF) {

        if (uploadStatus) {

            uploadStatus.innerText =
                "❌ Please select a PDF file.";

        }

        fileInput.value = "";

        return;
    }


    /* -----------------------------------------------------
       SHOW FILE NAME
    ----------------------------------------------------- */

    if (fileName) {

        fileName.innerText =
            "📄 Selected: " +
            file.name;

    }


    /* -----------------------------------------------------
       SHOW LOADING
    ----------------------------------------------------- */

    if (uploadStatus) {

        uploadStatus.innerText =
            "⏳ Uploading and extracting syllabus...";

    }


    /* -----------------------------------------------------
       CREATE FORM DATA
    ----------------------------------------------------- */

    const formData =
        new FormData();


    /*
       IMPORTANT:

       Flask expects:
       request.files.get("syllabus")
    */

    formData.append(
        "syllabus",
        file
    );


    /* -----------------------------------------------------
       SEND TO FLASK
    ----------------------------------------------------- */

    try {

        console.log(
            "📤 Sending PDF to Flask..."
        );


        const response =
            await fetch(
                "/upload_syllabus",
                {
                    method: "POST",
                    body: formData
                }
            );


        console.log(
            "📡 Server status:",
            response.status
        );


        /* -------------------------------------------------
           GET RAW RESPONSE
        ------------------------------------------------- */

        const responseText =
            await response.text();


        console.log(
            "📥 Server response:",
            responseText
        );


        /* -------------------------------------------------
           PARSE JSON
        ------------------------------------------------- */

        let data;


        try {

            data =
                JSON.parse(
                    responseText
                );

        } catch (jsonError) {

            console.error(
                "❌ Invalid JSON returned by Flask:",
                responseText
            );

            throw new Error(
                "Server did not return valid JSON."
            );

        }


        /* -------------------------------------------------
           HTTP ERROR
        ------------------------------------------------- */

        if (!response.ok) {

            throw new Error(
                data.error ||
                data.message ||
                "PDF upload failed."
            );

        }


        /* -------------------------------------------------
           SUCCESS
        ------------------------------------------------- */

        if (data.success) {


            console.log(
                "✅ PDF extraction successful."
            );


            /* ---------------------------------------------
               PUT EXTRACTED TEXT INTO TEXTAREA
            --------------------------------------------- */

            if (syllabusText) {

                syllabusText.value =
                    data.text || "";

                syllabusText.scrollTop = 0;

            }


            /* ---------------------------------------------
               STATUS
            --------------------------------------------- */

            if (uploadStatus) {

                uploadStatus.innerText =
                    "✅ Syllabus extracted successfully!";

            }


            console.log(
                "Characters extracted:",
                (data.text || "").length
            );


        }


        /* -------------------------------------------------
           SERVER RETURNED ERROR
        ------------------------------------------------- */

        else {

            const message =
                data.error ||
                data.message ||
                "Could not extract syllabus.";


            console.error(
                "❌ Upload failed:",
                message
            );


            if (uploadStatus) {

                uploadStatus.innerText =
                    "❌ " +
                    message;

            }

        }


    } catch (error) {


        console.error(
            "❌ PDF Upload Error:",
            error
        );


        if (uploadStatus) {

            uploadStatus.innerText =
                "❌ Error uploading PDF: " +
                (
                    error.message ||
                    "Please try again."
                );

        }

    }

}


/* =========================================================
   GENERATE PERSONALIZED LEARNING PLAN
========================================================= */

function generatePlan() {


    /* -----------------------------------------------------
       GET VALUES
    ----------------------------------------------------- */

    const course =
        getValue("course");


    const semester =
        getValue("semester");


    const syllabus =
        getValue("syllabusText");


    const examDate =
        getValue("examDate");


    const studyTime =
        getValue("studyTime");


    /* -----------------------------------------------------
       VALIDATION
    ----------------------------------------------------- */

    if (!syllabus) {

        alert(
            "Please type your syllabus or upload a syllabus file first!"
        );

        return;
    }


    if (!examDate) {

        alert(
            "Please select your exam date!"
        );

        return;
    }


    if (!studyTime) {

        alert(
            "Please enter your daily study time!"
        );

        return;
    }


    /* -----------------------------------------------------
       EXTRACT TOPICS
    ----------------------------------------------------- */

    topics =
        extractTopics(
            syllabus
        );


    console.log(
        "Extracted topics:",
        topics
    );


    if (
        !topics ||
        topics.length === 0
    ) {

        alert(
            "Could not identify topics. Please enter the syllabus clearly."
        );

        return;
    }


    /* -----------------------------------------------------
       RESET
    ----------------------------------------------------- */

    currentTopicIndex = 0;

    unlockedTopics =
        new Set([0]);


    /* -----------------------------------------------------
       CALCULATE DAYS
    ----------------------------------------------------- */

    const today =
        new Date();


    const exam =
        new Date(
            examDate +
            "T23:59:59"
        );


    const difference =
        exam -
        today;


    let daysRemaining =
        Math.ceil(
            difference /
            (
                1000 *
                60 *
                60 *
                24
            )
        );


    if (
        daysRemaining < 1
    ) {

        daysRemaining = 1;

    }


    /*
       Never create more days
       than number of topics.
    */

    daysRemaining =
        Math.min(
            daysRemaining,
            topics.length
        );


    /* -----------------------------------------------------
       PLAN SUMMARY
    ----------------------------------------------------- */

    const planSummary =
        document.getElementById(
            "planSummary"
        );


    if (planSummary) {

        planSummary.innerHTML = `

            <div class="plan-summary-box">

                <h3>
                    🎯 Your Personalized Learning Plan
                </h3>

                <p>
                    <b>Course:</b>
                    ${escapeHTML(
                        course ||
                        "Not specified"
                    )}
                </p>

                <p>
                    <b>Semester:</b>
                    ${escapeHTML(
                        semester ||
                        "Not specified"
                    )}
                </p>

                <p>
                    <b>Topics Found:</b>
                    ${topics.length}
                </p>

                <p>
                    <b>Study Days:</b>
                    ${daysRemaining}
                </p>

                <p>
                    <b>Daily Study Time:</b>
                    ${escapeHTML(
                        studyTime
                    )}
                    hours
                </p>

                <div
                    style="
                        margin-top:15px;
                        padding:12px;
                        border-radius:10px;
                        background:rgba(0,0,0,0.18);
                    "
                >

                    💡 <strong>How to use:</strong>

                    Select a topic,
                    learn it,
                    explain it in your own words,
                    and score <b>80%+</b>
                    to unlock the next topic.

                </div>

            </div>

        `;

    }


    /* -----------------------------------------------------
       CREATE PLAN
    ----------------------------------------------------- */

    const planOutput =
        document.getElementById(
            "planOutput"
        );


    if (!planOutput) {

        return;
    }


    planOutput.innerHTML =
        "";


    /*
       Maximum 5 topics per row.

       Example:

       Topic 1 | Topic 2 | Topic 3 | Topic 4 | Topic 5

       Then next row/day.
    */

    const topicsPerDay =
        Math.max(
            1,
            Math.ceil(
                topics.length /
                daysRemaining
            )
        );


    let topicIndex =
        0;


    /* -----------------------------------------------------
       CREATE DAY SECTIONS
    ----------------------------------------------------- */

    for (
        let day = 1;
        day <= daysRemaining;
        day++
    ) {


        const dayTopics =
            topics.slice(
                topicIndex,
                topicIndex +
                topicsPerDay
            );


        if (
            dayTopics.length === 0
        ) {

            break;

        }


        /* -------------------------------------------------
           DAY CONTAINER
        ------------------------------------------------- */

        let dayHTML = `

            <div
                class="day-section"
                style="
                    margin-top:20px;
                    padding:20px;
                    border-radius:18px;
                    background:
                        linear-gradient(
                            135deg,
                            rgba(18,38,28,0.96),
                            rgba(29,58,41,0.96)
                        );
                    border-left:6px solid #d4a64a;
                    box-shadow:
                        0 10px 25px rgba(0,0,0,0.35);
                "
            >

                <div
                    class="day-header"
                    style="
                        display:flex;
                        justify-content:space-between;
                        align-items:center;
                        margin-bottom:18px;
                    "
                >

                    <div
                        style="
                            font-size:23px;
                            font-weight:bold;
                            color:#f3d27a;
                        "
                    >

                        📅 Day ${day}

                    </div>

                    <div
                        style="
                            color:#d8d1c0;
                            font-size:14px;
                        "
                    >

                        ${dayTopics.length}
                        topic${dayTopics.length > 1 ? "s" : ""}

                    </div>

                </div>


                <div
                    class="topics-grid"
                    style="
                        display:grid;
                        grid-template-columns:
                            repeat(
                                5,
                                minmax(0,1fr)
                            );
                        gap:15px;
                    "
                >

        `;


        /* -------------------------------------------------
           CREATE TOPIC CARDS
        ------------------------------------------------- */

        dayTopics.forEach(
            function(
                topic,
                localIndex
            ) {


                const actualIndex =
                    topicIndex +
                    localIndex;


                const locked =
                    !unlockedTopics.has(actualIndex);


                dayHTML += `

                    <div
                        id="topic-card-${actualIndex}"
                        class="learning-topic-card"
                        onclick="selectTopic(${actualIndex})"
                        role="button"
                        tabindex="0"
                        style="
                            position:relative;
                            min-height:145px;
                            padding:18px;
                            border-radius:15px;
                            cursor:pointer;

                            background:
                                linear-gradient(
                                    135deg,
                                    #14281e,
                                    #203d2d
                                );

                            border:
                                1px solid
                                rgba(
                                    212,
                                    166,
                                    74,
                                    0.28
                                );

                            transition:
                                transform 0.25s ease,
                                box-shadow 0.25s ease,
                                border-color 0.25s ease;

                            display:flex;
                            flex-direction:column;
                            justify-content:space-between;
                        "
                        onkeydown="
                            if(event.key === 'Enter')
                                selectTopic(${actualIndex})
                        "
                    >

                        <div
                            style="
                                display:flex;
                                justify-content:space-between;
                                align-items:center;
                            "
                        >

                            <div
                                style="
                                    width:32px;
                                    height:32px;
                                    border-radius:50%;
                                    display:flex;
                                    align-items:center;
                                    justify-content:center;

                                    background:
                                        rgba(
                                            212,
                                            166,
                                            74,
                                            0.18
                                        );

                                    color:#f3d27a;
                                    font-weight:bold;
                                "
                            >

                                ${localIndex + 1}

                            </div>


                            <div
                                class="topic-lock-icon"
                                style="
                                    font-size:22px;
                                "
                            >

                                ${
                                    locked
                                    ? "🔒"
                                    : "📚"
                                }

                            </div>

                        </div>


                        <div>

                            <h4
                                style="
                                    margin:12px 0 6px;
                                    color:#f3d27a;
                                    font-size:16px;
                                    line-height:1.35;
                                "
                            >

                                ${escapeHTML(topic)}

                            </h4>


                            <p
                                class="topic-status"
                                style="
                                    margin:0;
                                    color:#cfc8b8;
                                    font-size:13px;
                                "
                            >

                                ${
                                    locked
                                    ? "🔒 Locked"
                                    : "Click to learn"
                                }

                            </p>

                        </div>


                        <div
                            style="
                                text-align:right;
                                color:#d4a64a;
                                font-size:20px;
                            "
                        >

                            →

                        </div>

                    </div>

                `;

            }
        );


        dayHTML += `

                </div>

            </div>

        `;


        planOutput.innerHTML +=
            dayHTML;


        topicIndex +=
            dayTopics.length;

    }


    /* -----------------------------------------------------
       RESPONSIVE FIX
    ----------------------------------------------------- */

    const styleId =
        "learnmirror-grid-style";


    if (
        !document.getElementById(
            styleId
        )
    ) {

        const style =
            document.createElement(
                "style"
            );


        style.id =
            styleId;


        style.innerHTML = `

            @media (max-width: 1100px) {

                .topics-grid {
                    grid-template-columns:
                        repeat(3, minmax(0,1fr))
                        !important;
                }

            }


            @media (max-width: 700px) {

                .topics-grid {
                    grid-template-columns:
                        repeat(2, minmax(0,1fr))
                        !important;
                }

            }


            @media (max-width: 450px) {

                .topics-grid {
                    grid-template-columns:
                        1fr
                        !important;
                }

            }


            .learning-topic-card:hover {

                transform:
                    translateY(-5px);

                border-color:
                    rgba(
                        243,
                        201,
                        105,
                        0.75
                    ) !important;

                box-shadow:
                    0 0 20px
                    rgba(
                        212,
                        166,
                        74,
                        0.22
                    );

            }

        `;


        document.head.appendChild(
            style
        );

    }


    /* -----------------------------------------------------
       LOG
    ----------------------------------------------------- */

    console.log(
        "========================================"
    );

    console.log(
        "LEARNMIRROR AI PLAN GENERATED"
    );

    console.log(
        "Total topics:",
        topics.length
    );

    console.log(
        "Study days:",
        daysRemaining
    );

    console.log(
        "========================================"
    );


    /* -----------------------------------------------------
       LOAD FIRST TOPIC
    ----------------------------------------------------- */

    selectTopic(0);


    /* -----------------------------------------------------
       SCROLL TO PLAN
    ----------------------------------------------------- */

    if (planSummary) {

        planSummary.scrollIntoView({

            behavior:
                "smooth",

            block:
                "start"

        });

    }

}


/* =========================================================
   EXTRACT TOPICS
========================================================= */

function extractTopics(
    syllabus
) {


    const extractedTopics =
        [];


    if (
        !syllabus ||
        !syllabus.trim()
    ) {

        return extractedTopics;

    }


    /* -----------------------------------------------------
       NORMALIZE TEXT
    ----------------------------------------------------- */

    let text =
        syllabus
            .replace(
                /\r/g,
                ""
            )
            .replace(
                /[•●▪◦]/g,
                "\n"
            )
            .replace(
                /\t/g,
                " "
            )
            .trim();


    /* -----------------------------------------------------
       NORMALIZE COMMON PDF SEPARATORS
    ----------------------------------------------------- */

    text =
        text.replace(
            /,\s*(?=[A-Z][A-Za-z0-9])/g,
            "\n"
        );


    text =
        text.replace(
            /;\s*/g,
            "\n"
        );


    text =
        text.replace(
            /\s+(?=\d+[\.)]\s+)/g,
            "\n"
        );


    /* -----------------------------------------------------
       SPLIT LINES
    ----------------------------------------------------- */

    const lines =
        text
            .split("\n")
            .map(
                line =>
                    line.trim()
            )
            .filter(
                line =>
                    line.length > 0
            );


    /* -----------------------------------------------------
       PROCESS EACH LINE
    ----------------------------------------------------- */

    lines.forEach(
        function(line) {


            let topic =
                line.trim();


            /* ---------------------------------------------
               REMOVE NUMBERING
            --------------------------------------------- */

            topic =
                topic.replace(
                    /^\s*\d+[\.\)\-:]\s*/,
                    ""
                );


            /* ---------------------------------------------
               REMOVE BULLETS
            --------------------------------------------- */

            topic =
                topic.replace(
                    /^\s*[-–—]\s*/,
                    ""
                );


            topic =
                topic.trim();


            if (!topic) {

                return;

            }


            const lower =
                topic.toLowerCase();


            /* ---------------------------------------------
               SKIP COMMON HEADINGS
            --------------------------------------------- */

            const headings = [

                "syllabus",

                "course contents",

                "contents",

                "table of contents",

                "course objectives",

                "objectives",

                "text books",

                "textbooks",

                "reference books",

                "references",

                "unit",

                "units",

                "module",

                "modules",

                "chapter",

                "chapters"

            ];


            if (
                headings.includes(
                    lower
                )
            ) {

                return;

            }


            /* ---------------------------------------------
               SKIP UNIT / MODULE / CHAPTER HEADINGS
            --------------------------------------------- */

            if (

                /^unit\s*(\d+|[ivxlcdm]+)/i
                    .test(topic)

                ||

                /^chapter\s*(\d+|[ivxlcdm]+)/i
                    .test(topic)

                ||

                /^module\s*(\d+|[ivxlcdm]+)/i
                    .test(topic)

            ) {

                return;

            }


            /* ---------------------------------------------
               SKIP PAGE NUMBERS
            --------------------------------------------- */

            if (

                /^page\s+\d+/i
                    .test(topic)

                ||

                /^page\s*[-:]?\s*\d+/i
                    .test(topic)

            ) {

                return;

            }


            /* ---------------------------------------------
               SKIP VERY LONG PARAGRAPHS
            --------------------------------------------- */

            if (
                topic.length > 160
            ) {

                return;

            }


            /* ---------------------------------------------
               REMOVE TRAILING PUNCTUATION
            --------------------------------------------- */

            topic =
                topic
                    .replace(
                        /[,:;]+$/,
                        ""
                    )
                    .trim();


            /* ---------------------------------------------
               VALID TOPIC
            --------------------------------------------- */

            if (
                topic.length > 2
            ) {

                extractedTopics.push(
                    topic
                );

            }

        }
    );


    /* -----------------------------------------------------
       REMOVE DUPLICATES
    ----------------------------------------------------- */

    return [
        ...new Set(
            extractedTopics
        )
    ];

}


/* =========================================================
   SELECT TOPIC
========================================================= */

function selectTopic(
    index
) {


    if (
        index < 0 ||
        index >= topics.length
    ) {

        return;

    }


    /* -----------------------------------------------------
       CHECK LOCK
    ----------------------------------------------------- */

    if (
        index !== 0 &&
        !unlockedTopics.has(index)
    ) {

        alert(
            "🔒 This topic is locked.\n\nScore 80% or above on the previous topic to unlock it."
        );

        return;

    }


    currentTopicIndex =
        index;


    const topic =
        topics[
            currentTopicIndex
        ];


    /* -----------------------------------------------------
       HIGHLIGHT SELECTED CARD
    ----------------------------------------------------- */

    document
        .querySelectorAll(
            ".learning-topic-card"
        )
        .forEach(
            card => {

                card.style.boxShadow =
                    "";

                card.style.borderColor =
                    "rgba(212,166,74,0.28)";

            }
        );


    const selectedCard =
        document.getElementById(
            "topic-card-" +
            index
        );


    if (selectedCard) {

        selectedCard.style.boxShadow =
            "0 0 25px rgba(243,201,105,0.35)";

        selectedCard.style.borderColor =
            "#f3c969";

    }


    /* -----------------------------------------------------
       LEARN CONTENT
    ----------------------------------------------------- */

    const learnContent =
        document.getElementById(
            "learnContent"
        );


    if (learnContent) {

        learnContent.innerHTML = `

            <h3>

                📚
                ${escapeHTML(topic)}

            </h3>


            <p>

                Study this topic carefully.

                Understand the main concepts,
                important definitions,
                differences,
                features and applications.

            </p>


            <br>


            <p>

                💡 After learning,
                explain this topic in your own words
                using the <b>Teach Back</b> section.

            </p>


            <br>


            <p>

                🎯 Score
                <b>80% or above</b>
                to unlock the next topic.

            </p>

        `;

    }


    /* -----------------------------------------------------
       CLEAR EXPLANATION
    ----------------------------------------------------- */

    const explanation =
        document.getElementById(
            "explanation"
        );


    if (explanation) {

        explanation.value =
            "";

    }


    /* -----------------------------------------------------
       RESET REPORT
    ----------------------------------------------------- */

    const report =
        document.getElementById(
            "report"
        );


    if (report) {

        report.innerHTML = `

            <div class="report-placeholder">

                <p>

                    Explain the topic and click
                    "Evaluate My Understanding".

                </p>

            </div>

        `;

    }


    /* -----------------------------------------------------
       LOAD RESOURCES
    ----------------------------------------------------- */

    loadLearningResources(
        topic
    );


    /* -----------------------------------------------------
       RESET AI TUTOR
    ----------------------------------------------------- */

    const tutorChat =
        document.getElementById(
            "tutorChat"
        );


    const tutorQuestion =
        document.getElementById(
            "tutorQuestion"
        );


    if (tutorChat) {

        tutorChat.innerHTML = `

            <div
                class="tutor-message tutor-ai"
            >

                👋 Hi! I'm your AI Tutor.

                <br><br>

                Ask me anything about
                <b>
                    ${escapeHTML(topic)}
                </b>.

            </div>

        `;

    }


    if (tutorQuestion) {

        tutorQuestion.value =
            "";

    }


    /* -----------------------------------------------------
       SCROLL
    ----------------------------------------------------- */

    if (learnContent) {

        learnContent.scrollIntoView({

            behavior:
                "smooth",

            block:
                "center"

        });

    }

}


/* =========================================================
   LEARNING RESOURCES
========================================================= */

function loadLearningResources(
    topic
) {


    const resources =
        document.getElementById(
            "learningResources"
        );


    if (!resources) {

        return;

    }


    const searchQuery =
        encodeURIComponent(
            topic
        );


    resources.innerHTML = `

        <div class="resources-box">

            <h3>

                🎥 Learning Resources

            </h3>


            <p class="small-text">

                Recommended resources for:

                <b>
                    ${escapeHTML(topic)}
                </b>

            </p>


            <div class="resource-grid">


                <!-- VIDEO -->

                <div class="resource-card">

                    <div class="resource-icon">
                        🎥
                    </div>


                    <h4>
                        Video Lessons
                    </h4>


                    <p>

                        Find video explanations
                        for this topic.

                    </p>


                    <a
                        href="https://www.youtube.com/results?search_query=${searchQuery}"
                        target="_blank"
                        rel="noopener noreferrer"
                    >

                        Watch Videos ↗

                    </a>

                </div>


                <!-- REFERENCES -->

                <div class="resource-card">

                    <div class="resource-icon">
                        📖
                    </div>


                    <h4>
                        Study References
                    </h4>


                    <p>

                        Explore additional
                        explanations and notes.

                    </p>


                    <a
                        href="https://www.google.com/search?q=${searchQuery}+study+notes"
                        target="_blank"
                        rel="noopener noreferrer"
                    >

                        Find Notes ↗

                    </a>

                </div>


                <!-- PRACTICE -->

                <div class="resource-card">

                    <div class="resource-icon">
                        💻
                    </div>


                    <h4>
                        Practice
                    </h4>


                    <p>

                        Search for questions
                        and practice problems.

                    </p>


                    <a
                        href="https://www.google.com/search?q=${searchQuery}+practice+questions"
                        target="_blank"
                        rel="noopener noreferrer"
                    >

                        Practice Now ↗

                    </a>

                </div>


            </div>

        </div>

    `;

}


/* =========================================================
   AI TUTOR
========================================================= */

async function askAITutor() {


    const questionInput =
        document.getElementById(
            "tutorQuestion"
        );


    const chat =
        document.getElementById(
            "tutorChat"
        );


    if (
        !questionInput ||
        !chat
    ) {

        return;

    }


    const question =
        questionInput.value.trim();


    if (!question) {

        return;

    }


    if (
        topics.length === 0 ||
        !topics[currentTopicIndex]
    ) {

        alert(
            "Please select a topic first."
        );

        return;

    }


    const topic =
        topics[
            currentTopicIndex
        ];


    /* -----------------------------------------------------
       SHOW USER MESSAGE
    ----------------------------------------------------- */

    chat.innerHTML += `

        <div
            class="tutor-message tutor-user"
        >

            🧑‍🎓
            ${escapeHTML(question)}

        </div>

    `;


    questionInput.value =
        "";


    /* -----------------------------------------------------
       LOADING
    ----------------------------------------------------- */

    const loadingId =
        "tutor-loading-" +
        Date.now();


    chat.innerHTML += `

        <div
            class="tutor-message tutor-ai"
            id="${loadingId}"
        >

            🤔 Thinking...

        </div>

    `;


    chat.scrollTop =
        chat.scrollHeight;


    /* -----------------------------------------------------
       REQUEST
    ----------------------------------------------------- */

    try {


        const response =
            await fetch(
                "/ask_tutor",
                {
                    method:
                        "POST",

                    headers:
                        {
                            "Content-Type":
                                "application/json"
                        },

                    body:
                        JSON.stringify({

                            topic:
                                topic,

                            question:
                                question

                        })

                }
            );


        const responseText =
            await response.text();


        let data;


        try {

            data =
                JSON.parse(
                    responseText
                );

        } catch {

            throw new Error(
                "Invalid server response."
            );

        }


        const loading =
            document.getElementById(
                loadingId
            );


        /* -------------------------------------------------
           SUCCESS
        ------------------------------------------------- */

        if (
            response.ok &&
            data.success
        ) {

            if (loading) {

                loading.innerHTML =
                    "🤖 " +
                    formatTutorAnswer(
                        data.answer ||
                        ""
                    );

            }

        }


        /* -------------------------------------------------
           ERROR
        ------------------------------------------------- */

        else {

            if (loading) {

                loading.innerHTML =
                    "❌ " +
                    escapeHTML(
                        data.error ||
                        data.message ||
                        "Something went wrong."
                    );

            }

        }


    } catch (error) {


        console.error(
            "AI Tutor Error:",
            error
        );


        const loading =
            document.getElementById(
                loadingId
            );


        if (loading) {

            loading.innerHTML =
                "❌ Unable to connect to AI Tutor. Make sure Ollama and Flask are running.";

        }

    }


    chat.scrollTop =
        chat.scrollHeight;

}
/* =========================================================
   PDF FILE SELECTION
========================================================= */

function handlePDFSelection(input) {

    const fileName = document.getElementById("fileName");
    const uploadStatus = document.getElementById("uploadStatus");

    if (!input || !input.files || input.files.length === 0) {

        if (fileName) {
            fileName.innerText = "No PDF selected";
        }

        if (uploadStatus) {
            uploadStatus.innerText = "";
        }

        return;
    }

    const file = input.files[0];

    console.log("📄 PDF selected:", file.name);
    console.log("📦 PDF size:", file.size, "bytes");
    console.log("📋 PDF type:", file.type);

    const isPDF =
        file.type === "application/pdf" ||
        file.name.toLowerCase().endsWith(".pdf");

    if (!isPDF) {

        alert("❌ Please select a PDF file.");

        input.value = "";

        if (fileName) {
            fileName.innerText = "No PDF selected";
        }

        if (uploadStatus) {

            uploadStatus.innerText = "";
        }

        return;
    }

    /* Show selected file */

    if (fileName) {
        fileName.innerText =
            "📄 Selected: " + file.name;
    }

    /* Show status */

    if (uploadStatus) {
        uploadStatus.innerText =
            "✅ PDF selected. Click Upload & Extract PDF.";
    }
}


/* =========================================================
   ESCAPE HTML
========================================================= */

function escapeHTML(
    text
) {


    const div =
        document.createElement(
            "div"
        );


    div.textContent =
        String(
            text ?? ""
        );


    return div.innerHTML;

}


/* =========================================================
   FORMAT AI ANSWER
========================================================= */

function formatTutorAnswer(
    text
) {

    return escapeHTML(
        text
    ).replace(
        /\n/g,
        "<br>"
    );

}


/* =========================================================
   START VOICE RECOGNITION
========================================================= */

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


    if (isRecording) {

        return;

    }


    recognition =
        new SpeechRecognition();


    recognition.continuous =
        true;


    recognition.interimResults =
        true;


    recognition.lang =
        "en-IN";


    isRecording =
        true;


    const explanation =
        document.getElementById(
            "explanation"
        );


    const voiceStatus =
        document.getElementById(
            "voiceStatus"
        );


    if (voiceStatus) {

        voiceStatus.innerText =
            "🔴 Listening... Speak freely.";

    }


    /* -----------------------------------------------------
       SPEECH RESULT
    ----------------------------------------------------- */

    recognition.onresult =
        function(event) {


            let finalTranscript =
                "";


            let interimTranscript =
                "";


            for (
                let i =
                    event.resultIndex;

                i <
                    event.results.length;

                i++
            ) {


                const transcript =
                    event.results[i][0]
                        .transcript;


                if (
                    event.results[i]
                        .isFinal
                ) {

                    finalTranscript +=
                        transcript +
                        " ";

                }

                else {

                    interimTranscript +=
                        transcript;

                }

            }


            /* ---------------------------------------------
               ADD FINAL SPEECH
            --------------------------------------------- */

            if (
                finalTranscript !== "" &&
                explanation
            ) {

                explanation.value +=
                    (
                        explanation.value
                            ? " "
                            : ""
                    ) +
                    finalTranscript.trim();

            }


            /* ---------------------------------------------
               INTERIM TEXT
            --------------------------------------------- */

            if (voiceStatus) {


                if (
                    interimTranscript
                ) {

                    voiceStatus.innerText =
                        "🔴 Listening: " +
                        interimTranscript;

                }

                else {

                    voiceStatus.innerText =
                        "🔴 Listening...";

                }

            }

        };


    /* -----------------------------------------------------
       ERROR
    ----------------------------------------------------- */

    recognition.onerror =
        function(event) {


            console.log(
                "Speech recognition error:",
                event.error
            );


            if (
                event.error ===
                    "not-allowed" ||

                event.error ===
                    "service-not-allowed"
            ) {

                isRecording =
                    false;


                if (voiceStatus) {

                    voiceStatus.innerText =
                        "❌ Microphone permission denied.";

                }

            }

        };


    /* -----------------------------------------------------
       AUTO RESTART
    ----------------------------------------------------- */

    recognition.onend =
        function() {


            if (isRecording) {


                setTimeout(
                    function() {


                        try {

                            recognition.start();

                        }

                        catch (error) {

                            console.log(
                                error
                            );

                        }

                    },
                    300
                );

            }

        };


    /* -----------------------------------------------------
       START
    ----------------------------------------------------- */

    try {

        recognition.start();

    }

    catch (error) {

        console.log(
            error
        );

    }

}


/* =========================================================
   STOP VOICE RECOGNITION
========================================================= */

function stopVoiceRecognition() {


    isRecording =
        false;


    if (recognition) {


        try {

            recognition.stop();

        }

        catch (error) {

            console.log(
                error
            );

        }

    }


    const voiceStatus =
        document.getElementById(
            "voiceStatus"
        );


    if (voiceStatus) {

        voiceStatus.innerText =
            "✅ Speaking stopped. Your explanation is ready for evaluation.";

    }

}


/* =========================================================
   EVALUATE EXPLANATION
========================================================= */

async function evaluateExplanation() {


    const explanationElement =
        document.getElementById(
            "explanation"
        );


    const report =
        document.getElementById(
            "report"
        );


    if (
        !explanationElement ||
        !report
    ) {

        return;

    }


    const explanation =
        explanationElement.value.trim();


    /* -----------------------------------------------------
       EMPTY
    ----------------------------------------------------- */

    if (!explanation) {

        alert(
            "Please explain the topic first!"
        );

        return;

    }


    /* -----------------------------------------------------
       TOPIC CHECK
    ----------------------------------------------------- */

    if (
        topics.length === 0 ||
        !topics[currentTopicIndex]
    ) {

        alert(
            "Please select a topic first."
        );

        return;

    }


    const topic =
        topics[
            currentTopicIndex
        ];


    /* -----------------------------------------------------
       WORD COUNT
    ----------------------------------------------------- */

    const words =
        explanation
            .split(/\s+/)
            .filter(
                word =>
                    word.length > 0
            );


    const wordCount =
        words.length;


    /* -----------------------------------------------------
       VERY SHORT ANSWER
    ----------------------------------------------------- */

    if (
        wordCount < 5
    ) {


        showReport({

            topic:
                topic,

            wordCount:
                wordCount,

            concept_accuracy:
                0,

            recall:
                0,

            application:
                0,

            explanation_depth:
                0,

            overall_score:
                0,

            feedback:
                "Your explanation is too short to demonstrate understanding. Please explain the concept using definitions, key points, examples, and applications.",

            unlock:
                false

        });


        return;

    }


    /* -----------------------------------------------------
       LOADING
    ----------------------------------------------------- */

    report.innerHTML = `

        <div class="report-placeholder">

            <p>

                🧠 AI is evaluating
                your explanation...

            </p>


            <p>

                Please wait.

            </p>

        </div>

    `;


    /* -----------------------------------------------------
       SEND TO FLASK
    ----------------------------------------------------- */

    try {


        const response =
            await fetch(
                "/evaluate_understanding",
                {

                    method:
                        "POST",

                    headers:
                        {
                            "Content-Type":
                                "application/json"
                        },

                    body:
                        JSON.stringify({

                            topic:
                                topic,

                            explanation:
                                explanation

                        })

                }
            );


        const responseText =
            await response.text();


        let data;


        try {

            data =
                JSON.parse(
                    responseText
                );

        }

        catch {

            throw new Error(
                "Invalid response from evaluation server."
            );

        }


        if (
            !response.ok ||
            !data.success
        ) {

            throw new Error(

                data.error ||
                data.message ||
                "Evaluation failed."

            );

        }

        /* -------------------------------------------------
   CHECK TOPIC RELEVANCE
------------------------------------------------- */

if (
    data.relevant === false ||
    data.report_available === false
) {

    report.innerHTML = `

        <div class="report-feedback">

            <h3>
                ⚠️ Answer Not Related
            </h3>

            <p>
                ${escapeHTML(
                    data.error ||
                    data.message ||
                    "Your answer is not related to the selected topic."
                )}
            </p>

            <p>
                🎯 Please explain the selected topic
                in your own words and try again.
            </p>

        </div>

    `;

    return;

}


        /* -------------------------------------------------
           SHOW REPORT
        ------------------------------------------------- */

        showReport({

            topic:
                topic,

            wordCount:
                wordCount,

            concept_accuracy:
                safeScore(
                    data.concept_accuracy
                ),

            recall:
                safeScore(
                    data.recall
                ),

            application:
                safeScore(
                    data.application
                ),

            explanation_depth:
                safeScore(
                    data.explanation_depth
                ),

            /*
               IMPORTANT:

               Use Flask's weighted final score.
               Do NOT average the four displayed
               values here.
            */

            overall_score:
                safeScore(
                    data.overall_score
                ),

            feedback:
                data.feedback ||
                "Keep improving your explanation.",

            unlock:
                Boolean(
                    data.unlock
                )

        });


    }

    catch (error) {


        console.error(
            "Evaluation Error:",
            error
        );


        report.innerHTML = `

            <div
                class="report-feedback"
            >

                <h3>
                    ❌ Evaluation Error
                </h3>


                <p>

                    ${escapeHTML(
                        error.message ||
                        "Unable to evaluate your explanation."
                    )}

                </p>


                <p>

                    Make sure Flask and Ollama
                    are running, and that the
                    <b>llama3.2</b> model is installed.

                </p>

            </div>

        `;

    }

}


/* =========================================================
   DISPLAY UNDERSTANDING REPORT
========================================================= */

function showReport(
    result
) {


    const report =
        document.getElementById(
            "report"
        );


    if (!report) {

        return;

    }


    const conceptAccuracy =
        safeScore(
            result.concept_accuracy
        );


    const recall =
        safeScore(
            result.recall
        );


    const application =
        safeScore(
            result.application
        );


    const explanationDepth =
        safeScore(
            result.explanation_depth
        );


    /*
       IMPORTANT:

       Use the weighted overall score
       returned by Flask.

       Flask uses:
       Concept = 50%
       Recall = 30%
       Explanation = 20%

       Application = bonus/supporting factor.
    */

    let score =
        safeScore(
            result.overall_score
        );


    /*
       Fallback only if no overall score
       was supplied.
    */

    if (
        result.overall_score ===
            undefined ||
        result.overall_score ===
            null
    ) {

        score =
            Math.round(
                (
                    conceptAccuracy * 0.50
                ) +

                (
                    recall * 0.30
                ) +

                (
                    explanationDepth * 0.20
                )
            );

    }


    const topic =
        result.topic ||
        "Current Topic";


    const wordCount =
        Number(
            result.wordCount
        ) || 0;


    /* -----------------------------------------------------
       REPORT HTML
    ----------------------------------------------------- */

    let reportHTML = `

        <div class="report-dashboard">


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


            <div class="main-progress">

                <div
                    class="main-progress-fill"
                    style="
                        width:${score}%
                    "
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
                        style="
                            width:${conceptAccuracy}%
                        "
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
                        style="
                            width:${recall}%
                        "
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
                        style="
                            width:${application}%
                        "
                    ></div>

                </div>


                <div class="attribute-score">

                    ${application}%

                </div>

            </div>


            <!-- EXPLANATION -->

            <div class="attribute-row">

                <div class="attribute-name">

                    📖 Explanation Depth

                </div>


                <div class="attribute-bar">

                    <div
                        class="attribute-fill depth-fill"
                        style="
                            width:${explanationDepth}%
                        "
                    ></div>

                </div>


                <div class="attribute-score">

                    ${explanationDepth}%

                </div>

            </div>


            <!-- TOPIC -->

            <div class="report-topic">

                📚 <b>Topic:</b>

                ${escapeHTML(topic)}

                <br><br>

                📝 <b>Words Used:</b>

                ${wordCount}

            </div>

    `;


    /* -----------------------------------------------------
       80%+ SUCCESS
    ----------------------------------------------------- */

    if (
        score >= 80
    ) {


        /*
           Unlock next topic.
        */

       if (
    currentTopicIndex <
    topics.length - 1
) {

    const nextTopicIndex =
    currentTopicIndex + 1;

unlockedTopics.add(
    nextTopicIndex
);

/* -------------------------------------------------
   UPDATE NEXT TOPIC CARD IMMEDIATELY
------------------------------------------------- */

const nextCard =
    document.getElementById(
        "topic-card-" +
        nextTopicIndex
    );

if (nextCard) {

    const icon =
        nextCard.querySelector(
            ".topic-lock-icon"
        );

    const status =
        nextCard.querySelector(
            ".topic-status"
        );

    if (icon) {

        icon.innerText =
            "📚";

    }

    if (status) {

        status.innerText =
            "Click to learn";

    }

}

}


        reportHTML += `

            <div
                class="report-feedback"
            >

                <h3>

                    🎉 Excellent Work!

                </h3>


                <p>

                    ${escapeHTML(
                        result.feedback ||
                        "You demonstrated a strong understanding of this topic."
                    )}

                </p>


                <p>

                    Your score is
                    <b>${score}%</b>.

                    The next topic is now
                    unlocked! 🚀

                </p>


                ${
                    currentTopicIndex <
                    topics.length - 1
                    ?

                    `

                    <button
                        class="next-topic-btn"
                        onclick="goToNextTopic()"
                    >

                        ➡️ Go to Next Topic

                    </button>

                    `

                    :

                    `

                    <p>

                        🎉 You completed
                        the final topic!

                    </p>

                    `
                }

            </div>

        `;


    }


    /* -----------------------------------------------------
       60-79
    ----------------------------------------------------- */

    else if (
        score >= 60
    ) {


        reportHTML += `

            <div
                class="report-feedback"
            >

                <h3>

                    👍 Good Attempt!

                </h3>


                <p>

                    ${escapeHTML(
                        result.feedback ||
                        "You have a basic understanding of the topic."
                    )}

                </p>


                <p>

                    Your score is
                    <b>${score}%</b>.

                </p>


                <p>

                    🎯 Add more concepts,
                    examples and practical
                    applications to reach
                    <b>80%</b>.

                </p>

            </div>

        `;

    }


    /* -----------------------------------------------------
       BELOW 60
    ----------------------------------------------------- */

    else {


        reportHTML += `

            <div
                class="report-feedback"
            >

                <h3>

                    📚 Keep Practicing!

                </h3>


                <p>

                    ${escapeHTML(
                        result.feedback ||
                        "Review the topic and explain it again with more important concepts and examples."
                    )}

                </p>


                <p>

                    Your current score is
                    <b>${score}%</b>.

                </p>


                <p>

                    🎯 You need at least
                    <b>80%</b>
                    to unlock the next topic.

                </p>

            </div>

        `;

    }


    reportHTML += `

        </div>

    `;


    /* -----------------------------------------------------
       DISPLAY
    ----------------------------------------------------- */

    report.innerHTML =
        reportHTML;


    /* -----------------------------------------------------
       SCROLL
    ----------------------------------------------------- */

    report.scrollIntoView({

        behavior:
            "smooth",

        block:
            "center"

    });

}


/* =========================================================
   SAFE SCORE
========================================================= */

function safeScore(
    value
) {


    const number =
        Number(value);


    if (
        !Number.isFinite(number)
    ) {

        return 0;

    }


    return Math.max(

        0,

        Math.min(

            100,

            Math.round(
                number
            )

        )

    );

}


/* =========================================================
   GO TO NEXT TOPIC
========================================================= */

function goToNextTopic() {


    if (
        currentTopicIndex >=
        topics.length - 1
    ) {


        const learnContent =
            document.getElementById(
                "learnContent"
            );


        if (learnContent) {

            learnContent.innerHTML = `

                <h3>

                    🎉 Congratulations!

                </h3>


                <p>

                    You have completed
                    all topics in your
                    current learning plan! 🚀

                </p>

            `;

        }


        alert(
            "🎉 Congratulations! You completed all topics!"
        );


        return;

    }


    const nextIndex =
        currentTopicIndex + 1;


    /* -----------------------------------------------------
       CHECK UNLOCK
    ----------------------------------------------------- */

    if (
        !unlockedTopics.has(
            nextIndex
        )
    ) {

        alert(
            "🔒 Score 80% or above on the current topic to unlock the next topic."
        );

        return;

    }


    currentTopicIndex =
        nextIndex;


    selectTopic(
        currentTopicIndex
    );

}


/* =========================================================
   GET VALUE
========================================================= */

function getValue(
    id
) {


    const element =
        document.getElementById(
            id
        );


    return element
        ? element.value.trim()
        : "";

}


/* =========================================================
   KEYBOARD ACCESS FOR TOPIC CARDS
========================================================= */

document.addEventListener(
    "keydown",
    function(event) {


        if (
            event.target &&
            event.target.classList &&
            event.target.classList.contains(
                "learning-topic-card"
            )
        ) {


            if (
                event.key ===
                "Enter"
            ) {

                event.target.click();

            }

        }

    }
);


/* =========================================================
   INITIAL LOAD
========================================================= */

console.log(
    "========================================"
);

console.log(
    "✅ LearnMirror AI script loaded successfully."
);

console.log(
    "📄 PDF Upload: Enabled"
);

console.log(
    "📅 Day-wise Plan: Enabled"
);

console.log(
    "📚 5 Topics Per Row: Enabled"
);

console.log(
    "🤖 AI Tutor: Enabled"
);

console.log(
    "🎤 Voice Recognition: Enabled"
);

console.log(
    "🧠 Teach Back Evaluation: Enabled"
);

console.log(
    "🎯 80% Unlock System: Enabled"
);

console.log(
    "========================================"
);