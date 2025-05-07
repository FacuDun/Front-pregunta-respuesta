const socket = io("https://back-preguntas-respuestas.onrender.com");

// Elementos del DOM
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

let username = "";
let currentQuestion = "";
let answers = [];
let players = [];
let scores = {};
let questionTimer;
let answerTimer;

// Unirse al juego
joinButton.addEventListener("click", () => {
    username = usernameInput.value.trim();
    if (username) {
        socket.emit("join", username);
        loginScreen.classList.add("hidden");
        lobbyScreen.classList.remove("hidden");
    }
});

// Iniciar partida (solo Facu)
startButton.addEventListener("click", () => {
    socket.emit("start-game");
});

// Enviar pregunta
submitQuestionBtn.addEventListener("click", () => {
    const question = questionInput.value.trim();
    if (question) {
        socket.emit("submit-question", question);
        clearInterval(questionTimer);
        submitQuestionBtn.disabled = true;
    }
});

// Enviar respuesta
submitAnswerBtn.addEventListener("click", () => {
    const answer = answerInput.value.trim();
    if (answer) {
        socket.emit("submit-answer", answer);
        clearInterval(answerTimer);
        submitAnswerBtn.disabled = true;
    }
});

// Escuchar actualizaciones del servidor
socket.on("update-lobby", (playersListData) => {
    players = playersListData;
    playersList.innerHTML = players.map(p => `<li>${p.name} ${p.isAdmin ? "(Admin)" : ""}</li>`).join("");
    startButton.classList.toggle("hidden", username !== "Facu");
});

socket.on("start-question-phase", () => {
    lobbyScreen.classList.add("hidden");
    questionScreen.classList.remove("hidden");
    questionInput.value = "";
    submitQuestionBtn.disabled = false;
    startQuestionTimer();
});

socket.on("start-answer-phase", (question) => {
    currentQuestion = question;
    questionScreen.classList.add("hidden");
    answerScreen.classList.remove("hidden");
    currentQuestionDisplay.textContent = question;
    answerInput.value = "";
    submitAnswerBtn.disabled = false;
    startAnswerTimer();
});

socket.on("start-vote-phase", (answersData) => {
    answers = answersData;
    answerScreen.classList.add("hidden");
    voteScreen.classList.remove("hidden");
    answersList.innerHTML = answers.map((a, i) => `
        <div>
            <p>${a.text}</p>
            <button onclick="voteForAnswer(${i})">Votar</button>
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
    
    scoreboard.innerHTML = Object.entries(scores)
        .sort((a, b) => b[1] - a[1])
        .map(([name, points]) => `<p>${name}: ${points} puntos</p>`)
        .join("");
});

socket.on("game-over", (finalScores) => {
    resultsScreen.classList.add("hidden");
    gameOverScreen.classList.remove("hidden");
    finalScoreboard.innerHTML = Object.entries(finalScores)
        .sort((a, b) => b[1] - a[1])
        .map(([name, points]) => `<p>${name}: ${points} puntos</p>`)
        .join("");
});

// Funciones de timer
function startQuestionTimer() {
    let time = 60;
    timeLeftDisplay.textContent = time;
    questionTimer = setInterval(() => {
        time--;
        timeLeftDisplay.textContent = time;
        if (time <= 0) {
            clearInterval(questionTimer);
            const question = questionInput.value.trim();
            if (question) {
                socket.emit("submit-question", question);
                submitQuestionBtn.disabled = true;
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
        if (time <= 0) {
            clearInterval(answerTimer);
            const answer = answerInput.value.trim();
            if (answer) {
                socket.emit("submit-answer", answer);
                submitAnswerBtn.disabled = true;
            }
        }
    }, 1000);
}

// Función global para votar
window.voteForAnswer = (index) => {
    socket.emit("vote", index);
};
