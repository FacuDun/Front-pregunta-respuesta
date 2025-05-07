const socket = io("https://back-preguntas-respuestas.onrender.com");

// ==================== ELEMENTOS DEL DOM ====================
const elements = {
    screens: {
        login: document.getElementById("login-screen"),
        lobby: document.getElementById("lobby-screen"),
        question: document.getElementById("question-screen"),
        answer: document.getElementById("answer-screen"),
        vote: document.getElementById("vote-screen"),
        results: document.getElementById("results-screen"),
        gameOver: document.getElementById("game-over-screen")
    },
    inputs: {
        username: document.getElementById("username-input"),
        question: document.getElementById("question-input"),
        answer: document.getElementById("answer-input")
    },
    displays: {
        players: document.getElementById("players-list"),
        timeLeft: document.getElementById("time-left"),
        answerTimeLeft: document.getElementById("answer-time-left"),
        currentQuestion: document.getElementById("current-question"),
        answers: document.getElementById("answers-list"),
        rankedAnswers: document.getElementById("ranked-answers"),
        scoreboard: document.getElementById("scoreboard"),
        finalScoreboard: document.getElementById("final-scoreboard")
    },
    buttons: {
        join: document.getElementById("join-button"),
        start: document.getElementById("start-button"),
        submitQuestion: document.getElementById("submit-question-btn"),
        submitAnswer: document.getElementById("submit-answer-btn")
    }
};

// ==================== ESTADO DEL JUEGO ====================
const gameState = {
    username: "",
    currentQuestion: "",
    answers: [],
    players: [],
    scores: {},
    timers: {
        question: null,
        answer: null,
        vote: null
    },
    hasSubmitted: {
        question: false,
        answer: false,
        vote: false
    }
};

// ==================== FUNCIONES PRINCIPALES ====================
function joinGame() {
    gameState.username = elements.inputs.username.value.trim();
    if (gameState.username) {
        socket.emit("join", gameState.username);
        toggleScreen("login", false);
        toggleScreen("lobby", true);
    }
}

function startGame() {
    socket.emit("start-game");
}

function submitQuestion() {
    const question = elements.inputs.question.value.trim();
    if (question && !gameState.hasSubmitted.question) {
        socket.emit("submit-question", question);
        gameState.hasSubmitted.question = true;
        updateButtonState("submitQuestion", true, "✓ Enviado");
        clearTimer("question");
    }
}

function submitAnswer() {
    const answer = elements.inputs.answer.value.trim();
    if (answer && !gameState.hasSubmitted.answer) {
        socket.emit("submit-answer", answer);
        gameState.hasSubmitted.answer = true;
        updateButtonState("submitAnswer", true, "✓ Enviado");
        clearTimer("answer");
    }
}

function voteForAnswer(index) {
    if (!gameState.hasSubmitted.vote) {
        socket.emit("vote", index);
        gameState.hasSubmitted.vote = true;
        // Deshabilitar todos los botones de votación
        document.querySelectorAll('.vote-btn').forEach(btn => {
            btn.disabled = true;
        });
    }
}

// ==================== MANEJO DE PANTALLAS ====================
function toggleScreen(screenName, show) {
    elements.screens[screenName].classList.toggle("hidden", !show);
}

function resetQuestionState() {
    toggleScreen("lobby", false);
    toggleScreen("question", true);
    elements.inputs.question.value = "";
    gameState.hasSubmitted.question = false;
    updateButtonState("submitQuestion", false, "Enviar Pregunta");
}

function resetAnswerState() {
    toggleScreen("question", false);
    toggleScreen("answer", true);
    elements.inputs.answer.value = "";
    gameState.hasSubmitted.answer = false;
    updateButtonState("submitAnswer", false, "Enviar Respuesta");
}

// ==================== TIMERS ====================
function startTimer(type, duration, displayElement, onEnd) {
    let time = duration;
    displayElement.textContent = time;
    
    gameState.timers[type] = setInterval(() => {
        time--;
        displayElement.textContent = time;
        
        if (time <= 0 || gameState.hasSubmitted[type]) {
            clearTimer(type);
            if (!gameState.hasSubmitted[type]) {
                onEnd();
            }
        }
    }, 1000);
}

function clearTimer(type) {
    if (gameState.timers[type]) {
        clearInterval(gameState.timers[type]);
        gameState.timers[type] = null;
    }
}

function startQuestionTimer() {
    startTimer("question", 60, elements.displays.timeLeft, () => {
        if (elements.inputs.question.value.trim()) {
            submitQuestion();
        }
    });
}

function startAnswerTimer() {
    startTimer("answer", 30, elements.displays.answerTimeLeft, () => {
        if (elements.inputs.answer.value.trim()) {
            submitAnswer();
        }
    });
}

// ==================== ACTUALIZACIÓN DE UI ====================
function updateButtonState(buttonName, disabled, text) {
    const button = elements.buttons[buttonName];
    button.disabled = disabled;
    button.textContent = text;
}

function updateScoreboard(scores) {
    elements.displays.scoreboard.innerHTML = Object.entries(scores)
        .sort((a, b) => b[1] - a[1])
        .map(([name, points]) => `<p>${name}: ${points} puntos</p>`)
        .join("");
}

// ==================== EVENT LISTENERS ====================
elements.buttons.join.addEventListener("click", joinGame);
elements.buttons.start.addEventListener("click", startGame);
elements.buttons.submitQuestion.addEventListener("click", submitQuestion);
elements.buttons.submitAnswer.addEventListener("click", submitAnswer);

// ==================== SOCKET LISTENERS ====================
socket.on("update-lobby", (players) => {
    gameState.players = players;
    elements.displays.players.innerHTML = players.map(p => 
        `<li>${p.name} ${p.isAdmin ? "(Admin)" : ""}</li>`
    ).join("");
    elements.buttons.start.classList.toggle("hidden", gameState.username !== "Facu");
});

socket.on("start-question-phase", () => {
    resetQuestionState();
    startQuestionTimer();
});

socket.on("start-answer-phase", (question) => {
    gameState.currentQuestion = question;
    resetAnswerState();
    elements.displays.currentQuestion.textContent = question;
    startAnswerTimer();
});

socket.on("start-vote-phase", (answers) => {
    gameState.answers = answers;
    gameState.hasSubmitted.vote = false;
    toggleScreen("answer", false);
    toggleScreen("vote", true);
    
    elements.displays.answers.innerHTML = answers.map((a, i) => `
        <div class="answer-item">
            <p>${a.text}</p>
            <button onclick="voteForAnswer(${i})" class="vote-btn">Votar</button>
        </div>
    `).join("");
});

socket.on("show-results", (rankedAnswers, scores) => {
    gameState.scores = scores;
    toggleScreen("vote", false);
    toggleScreen("results", true);
    
    elements.displays.rankedAnswers.innerHTML = rankedAnswers.map((a, i) => `
        <p>${i + 1}. ${a.text} (${a.votes} votos)</p>
    `).join("");
    
    updateScoreboard(scores);
});

socket.on("game-over", (finalScores) => {
    toggleScreen("results", false);
    toggleScreen("gameOver", true);
    elements.displays.finalScoreboard.innerHTML = Object.entries(finalScores)
        .sort((a, b) => b[1] - a[1])
        .map(([name, points]) => `<p>${name}: ${points} puntos</p>`)
        .join("");
});

// ==================== INICIALIZACIÓN ====================
window.voteForAnswer = voteForAnswer;
