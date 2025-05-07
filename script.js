const socket = io("https://back-preguntas-respuestas.onrender.com");

// ==================== ELEMENTOS DEL DOM ====================
const loginScreen = document.getElementById("login-screen");
const lobbyScreen = document.getElementById("lobby-screen");
const questionScreen = document.getElementById("question-screen");
const answerScreen = document.getElementById("answer-screen");
const voteScreen = document.getElementById("vote-screen");
const resultsScreen = document.getElementById("results-screen");
const gameOverScreen = document.getElementById("game-over-screen");

const usernameInput = document.getElementById("username-input");
const joinButton = document.getElementById("join-button");
const playersList = document.getElementById("players-list");
const startButton = document.getElementById("start-button");
const questionInput = document.getElementById("question-input");
const timeLeftDisplay = document.getElementById("time-left");
const answerInput = document.getElementById("answer-input");
const answerTimeLeftDisplay = document.getElementById("answer-time-left");
const currentQuestionDisplay = document.getElementById("current-question");
const answersList = document.getElementById("answers-list");
const rankedAnswers = document.getElementById("ranked-answers");
const scoreboard = document.getElementById("scoreboard");
const finalScoreboard = document.getElementById("final-scoreboard");
const submitQuestionBtn = document.getElementById("submit-question-btn");
const submitAnswerBtn = document.getElementById("submit-answer-btn");

// ==================== ESTADO DEL JUEGO ====================
let username = "";
let currentQuestion = "";
let answers = [];
let players = [];
let scores = {};
let questionTimer;
let answerTimer;
let hasSubmittedQuestion = false;
let hasSubmittedAnswer = false;

// ==================== EVENT LISTENERS ====================
joinButton.addEventListener("click", () => {
    username = usernameInput.value.trim();
    if (username) {
        socket.emit("join", username);
        loginScreen.classList.add("hidden");
        lobbyScreen.classList.remove("hidden");
    }
});

startButton.addEventListener("click", () => {
    socket.emit("start-game");
});

submitQuestionBtn.addEventListener("click", submitQuestion);
submitAnswerBtn.addEventListener("click", submitAnswer);

// ==================== FUNCIONES DE ENVÍO ====================
function submitQuestion() {
    const question = questionInput.value.trim();
    if (question && !hasSubmittedQuestion) {
        socket.emit("submit-question", question);
        hasSubmittedQuestion = true;
        submitQuestionBtn.disabled = true;
        submitQuestionBtn.textContent = "✓ Enviado";
        clearInterval(questionTimer);
    }
}

function submitAnswer() {
    const answer = answerInput.value.trim();
    if (answer && !hasSubmittedAnswer) {
        socket.emit("submit-answer", answer);
        hasSubmittedAnswer = true;
        submitAnswerBtn.disabled = true;
        submitAnswerBtn.textContent = "✓ Enviado";
        clearInterval(answerTimer);
    }
}

// ==================== SOCKET LISTENERS ====================
socket.on("update-lobby", (playersListData) => {
    players = playersListData;
    playersList.innerHTML = players.map(p => `<li>${p.name} ${p.isAdmin ? "(Admin)" : ""}</li>`).join("");
    startButton.classList.toggle("hidden", username !== "Facu");
});

socket.on("start-question-phase", () => {
    resetQuestionState();
    startQuestionTimer();
});

socket.on("start-answer-phase", (question) => {
    resetAnswerState();
    currentQuestionDisplay.textContent = question;
    startAnswerTimer();
});

socket.on("start-vote-phase", (answersData) => {
    answers = answersData;
    answerScreen.classList.add("hidden");
    voteScreen.classList.remove("hidden");
    answersList.innerHTML = answers.map((a, i) => `
        <div class="answer-item">
            <p>${a.text}</p>
            <button onclick="voteForAnswer(${i})" class="vote-btn">Votar</button>
        </div>
    `).join("");
});

socket.on("show-results", (rankedAnswersData, updatedScores) => {
    scores = updatedScores;
    voteScreen.classList.add("hidden");
    resultsScreen.classList.remove("hidden");
    
    rankedAnswers.innerHTML = rankedAnswersData.map((a, i) => `
        <p>${i + 1}. ${a.text} (${a.votes} votos)</p>
    `).join("");
    
    updateScoreboard();
});

socket.on("game-over", (finalScores) => {
    resultsScreen.classList.add("hidden");
    gameOverScreen.classList.remove("hidden");
    finalScoreboard.innerHTML = Object.entries(finalScores)
        .sort((a, b) => b[1] - a[1])
        .map(([name, points]) => `<p>${name}: ${points} puntos</p>`)
        .join("");
});

// ==================== FUNCIONES AUXILIARES ====================
function resetQuestionState() {
    lobbyScreen.classList.add("hidden");
    questionScreen.classList.remove("hidden");
    questionInput.value = "";
    hasSubmittedQuestion = false;
    submitQuestionBtn.disabled = false;
    submitQuestionBtn.textContent = "Enviar Pregunta";
}

function resetAnswerState() {
    questionScreen.classList.add("hidden");
    answerScreen.classList.remove("hidden");
    answerInput.value = "";
    hasSubmittedAnswer = false;
    submitAnswerBtn.disabled = false;
    submitAnswerBtn.textContent = "Enviar Respuesta";
}

function updateScoreboard() {
    scoreboard.innerHTML = Object.entries(scores)
        .sort((a, b) => b[1] - a[1])
        .map(([name, points]) => `<p>${name}: ${points} puntos</p>`)
        .join("");
}

// ==================== TIMERS ====================
function startQuestionTimer() {
    let time = 60;
    timeLeftDisplay.textContent = time;
    questionTimer = setInterval(() => {
        time--;
        timeLeftDisplay.textContent = time;
        
        if (time <= 0 || hasSubmittedQuestion) {
            clearInterval(questionTimer);
            if (!hasSubmittedQuestion && questionInput.value.trim()) {
                submitQuestion();
            }
        }
    }, 1000);
}

function startAnswerTimer() {
    let time = 30;
    answerTimeLeftDisplay.textContent = time;
    answerTimer = setInterval(() => {
        time--;
        answerTimeLeftDisplay.textContent = time;
        
        if (time <= 0 || hasSubmittedAnswer) {
            clearInterval(answerTimer);
            if (!hasSubmittedAnswer && answerInput.value.trim()) {
                submitAnswer();
            }
        }
    }, 1000);
}

// ==================== FUNCIÓN GLOBAL ====================
window.voteForAnswer = (index) => {
    socket.emit("vote", index);
};
