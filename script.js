import { ref, set, get, onValue, update }
from "https://www.gstatic.com/firebasejs/12.8.0/firebase-database.js";

const db = window.firebaseDB;

let gameCode = "";
let playerId = "";
let gameRef = null;

document.getElementById("createBtn").onclick = createGame;
document.getElementById("joinBtn").onclick = joinGame;
document.getElementById("saveNameBtn").onclick = saveName;

function generateCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

/* יצירת משחק */
async function createGame() {
  gameCode = generateCode();
  playerId = "p1";
  gameRef = ref(db, "games/" + gameCode);

  await set(gameRef, {
    players: { p1: true },
    phase: "waiting"
  });

  document.getElementById("status").innerText =
    `קוד המשחק: ${gameCode}\nממתין לשחקן נוסף...`;

  listen();
}

/* הצטרפות */
async function joinGame() {
  const code = document.getElementById("codeInput").value.trim().toUpperCase();
  if (!code) return;

  gameCode = code;
  playerId = "p2";
  gameRef = ref(db, "games/" + gameCode);

  const snap = await get(gameRef);
  if (!snap.exists()) {
    alert("קוד לא קיים");
    return;
  }

  await update(gameRef, {
    "players/p2": true,
    phase: "names"
  });

  listen();
}

/* האזנה */
function listen() {
  onValue(gameRef, snap => {
    const data = snap.val();
    if (!data) return;

    if (data.phase === "waiting") {
      document.getElementById("status").innerText =
        `קוד המשחק: ${gameCode}\nממתין לשחקן נוסף...`;
    }

    if (data.phase === "names") {
      showNameScreen(data);
    }

    if (data.phase === "chooseBombs") {
      startBombPhase(data);
    }
  });
}

/* מסך שמות */
function showNameScreen(data) {
  document.getElementById("home").classList.add("hidden");
  document.getElementById("status").classList.add("hidden");
  document.getElementById("nameScreen").classList.remove("hidden");

  const names = data.names || {};

  if (names[playerId]) {
    document.getElementById("waitText").innerText =
      "ממתין לשחקן השני...";
  }
}

/* שמירת שם */
async function saveName() {
  const name = document.getElementById("nameInput").value.trim();
  if (!name) return;

  await update(gameRef, {
    [`names/${playerId}`]: name
  });

  const snap = await get(gameRef);
  const data = snap.val();

  if (data.names?.p1 && data.names?.p2) {
    await update(gameRef, {
      phase: "chooseBombs",
      turn: "p1"
    });
  } else {
    document.getElementById("waitText").innerText =
      "ממתין לשחקן השני...";
  }
}

/* =========================
   שלב בחירת הפצצות
========================= */

function startBombPhase(data) {
  document.getElementById("nameScreen").classList.add("hidden");
  document.getElementById("board").classList.remove("hidden");

  const names = data.names || {};
  const turn = data.turn;

  document.getElementById("status").classList.remove("hidden");
  document.getElementById("status").innerText =
    `תור ${names[turn]} לבחור פצצות`;

  createBombBoard(data);
}

/* יצירת לוח לבחירת פצצות */
function createBombBoard(data) {
  const board = document.getElementById("board");
  board.innerHTML = "";

  const myBombs = data.bombs?.[playerId] || [];

  for (let i = 0; i < 18; i++) {
    const div = document.createElement("div");
    div.className = "circle";

    // סמיילי פצצה רק אצלך
    if (myBombs.includes(i)) {
      div.innerText = "💣";
    }

    // אפשר לבחור רק אם זה התור שלך ורק בצד שלך
    const isMyTurn = data.turn === playerId;
    const isMySide = playerId === "p1" ? i < 9 : i >= 9;

    if (isMyTurn && isMySide && myBombs.length < 3) {
      div.onclick = () => chooseBomb(i, myBombs);
    }

    board.appendChild(div);
  }
}

/* בחירת פצצה */
async function chooseBomb(index, myBombs) {
  if (myBombs.includes(index)) return;

  const newBombs = [...myBombs, index];

  await update(gameRef, {
    [`bombs/${playerId}`]: newBombs
  });

  // אם בחר 3 → עובר תור
  if (newBombs.length === 3) {
    const nextTurn = playerId === "p1" ? "p2" : "p1";
    await update(gameRef, { turn: nextTurn });
  }
}
