(() => {
  const CARDS = [
    { id: "bolt", name: "Bolt", power: 3, effect: "none", effectText: "No effect" },
    { id: "wall", name: "Wall", power: 4, effect: "none", effectText: "No effect" },
    { id: "spark", name: "Spark", power: 2, effect: "plus1", effectText: "+1 power (face-up)" },
    { id: "surge", name: "Surge", power: 3, effect: "plus1", effectText: "+1 power (face-up)" },
    { id: "scout", name: "Scout", power: 2, effect: "peek", effectText: "Peek one face-down" },
    { id: "spy", name: "Spy", power: 1, effect: "peek", effectText: "Peek one face-down" },
    { id: "swapper", name: "Swapper", power: 3, effect: "swap", effectText: "Swap to another lane" },
    { id: "juke", name: "Juke", power: 2, effect: "swap", effectText: "Swap to another lane" },
    { id: "titan", name: "Titan", power: 5, effect: "none", effectText: "No effect" },
    { id: "feint", name: "Feint", power: 4, effect: "plus1", effectText: "+1 power (face-up)" },
  ];

  const el = {
    mode: document.getElementById("mode-screen"),
    game: document.getElementById("game-screen"),
    end: document.getElementById("end-screen"),
    status: document.getElementById("status"),
    board: document.getElementById("board"),
    hand: document.getElementById("hand"),
    actions: document.getElementById("actions"),
    peek: document.getElementById("peek-banner"),
    endTitle: document.getElementById("end-title"),
    endDetail: document.getElementById("end-detail"),
  };

  let state = null;
  let selectedCardId = null;
  let pendingLane = null;

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function cloneCard(c) {
    return { ...c, powerMod: 0, revealed: false, faceUp: false };
  }

  function startGame(mode) {
    const deck = shuffle(CARDS).map(cloneCard);
    state = {
      mode,
      turn: "p1",
      phase: "place",
      hands: { p1: deck.slice(0, 5), p2: deck.slice(5, 10) },
      lanes: [
        { p1: null, p2: null },
        { p1: null, p2: null },
        { p1: null, p2: null },
      ],
      peekMsg: "",
      scores: null,
    };
    selectedCardId = null;
    pendingLane = null;
    show("game");
    render();
    maybeAi();
  }

  function show(which) {
    el.mode.classList.toggle("hidden", which !== "mode");
    el.game.classList.toggle("hidden", which !== "game");
    el.end.classList.toggle("hidden", which !== "end");
  }

  function emptyLanesFor(player) {
    return state.lanes
      .map((lane, i) => ({ lane, i }))
      .filter(({ lane }) => !lane[player]);
  }

  function placementsLeft(player) {
    return emptyLanesFor(player).length;
  }

  function bothPlaced() {
    return state.lanes.every((l) => l.p1 && l.p2);
  }

  function statusText() {
    if (state.phase === "resolve") return "Revealing and scoring…";
    const who =
      state.mode === "ai"
        ? state.turn === "p1"
          ? "Your turn"
          : "AI thinking…"
        : state.turn === "p1"
          ? "Player 1 — your turn (pass the phone)"
          : "Player 2 — your turn (pass the phone)";
    if (selectedCardId && pendingLane === null) return `${who}: tap an empty lane for this card.`;
    if (selectedCardId && pendingLane !== null) return `${who}: Face-up for effect, or face-down to bluff.`;
    return `${who}: pick a card, then a lane.`;
  }

  function canSeeIdentity(player, card) {
    if (card.faceUp || card.revealed || state.phase !== "place") return true;
    if (state.mode === "ai") return player === "p1";
    // hotseat: only current player sees their own face-down identities
    return state.turn === player;
  }

  function render() {
    el.status.textContent = statusText();
    el.peek.classList.toggle("hidden", !state.peekMsg);
    el.peek.textContent = state.peekMsg || "";

    el.board.innerHTML = "";
    state.lanes.forEach((lane, i) => {
      const wrap = document.createElement("div");
      wrap.className = "lane";
      wrap.innerHTML = `<div class="lane-label">Lane ${i + 1}</div>`;
      const slots = document.createElement("div");
      slots.className = "lane-slots";

      ["p1", "p2"].forEach((player) => {
        const slot = document.createElement("div");
        slot.className = "slot";
        const label =
          state.mode === "ai"
            ? player === "p1"
              ? "You"
              : "AI"
            : player === "p1"
              ? "P1"
              : "P2";
        slot.innerHTML = `<div class="who">${label}</div>`;
        const card = lane[player];
        if (card) {
          const mini = document.createElement("div");
          if (canSeeIdentity(player, card)) {
            if (card.faceUp || card.revealed || state.phase !== "place") {
              mini.className = "card-mini face-up";
              const pwr = card.power + (card.powerMod || 0);
              mini.innerHTML = `<span class="pwr">${pwr}</span> ${card.name}<div class="meta">${card.effectText}</div>`;
            } else {
              mini.className = "card-mini face-down";
              mini.innerHTML = `Bluff · <strong>${card.name}</strong> (${card.power})`;
            }
          } else {
            mini.className = "card-mini face-down";
            mini.textContent = "Face-down bluff";
          }
          slot.appendChild(mini);
        } else if (
          state.phase === "place" &&
          selectedCardId &&
          pendingLane === null &&
          player === state.turn &&
          !(state.mode === "ai" && state.turn === "p2")
        ) {
          slot.classList.add("selectable");
          slot.addEventListener("click", () => chooseLane(i));
          slot.innerHTML += `<div style="color:var(--accent);font-size:0.8rem">Tap to place</div>`;
        } else {
          slot.innerHTML += `<div style="color:var(--muted);font-size:0.8rem">Empty</div>`;
        }
        slots.appendChild(slot);
      });

      wrap.appendChild(slots);
      el.board.appendChild(wrap);
    });

    el.hand.innerHTML = "";
    const humanTurn =
      state.phase === "place" &&
      !(state.mode === "ai" && state.turn === "p2");
    if (humanTurn) {
      state.hands[state.turn].forEach((card) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "card" + (selectedCardId === card.id ? " selected" : "");
        btn.innerHTML = `<span class="name">${card.name}</span><span class="meta">Power ${card.power} · ${card.effectText}</span>`;
        btn.addEventListener("click", () => {
          selectedCardId = card.id;
          pendingLane = null;
          el.actions.classList.add("hidden");
          render();
        });
        el.hand.appendChild(btn);
      });
    }

    el.actions.classList.toggle(
      "hidden",
      !(humanTurn && selectedCardId && pendingLane !== null)
    );
  }

  function chooseLane(i) {
    if (!selectedCardId || state.phase !== "place") return;
    if (state.lanes[i][state.turn]) return;
    pendingLane = i;
    render();
  }

  function applyFaceUpEffect(player, laneIndex, card) {
    if (card.effect === "plus1") {
      card.powerMod = (card.powerMod || 0) + 1;
      return;
    }
    if (card.effect === "peek") {
      const opp = player === "p1" ? "p2" : "p1";
      const downs = state.lanes
        .map((l, idx) => ({ idx, c: l[opp] }))
        .filter((x) => x.c && !x.c.faceUp && !x.c.revealed);
      if (downs.length) {
        const pick = downs[Math.floor(Math.random() * downs.length)];
        pick.c.revealed = true;
        state.peekMsg = `Peek: Lane ${pick.idx + 1} — ${pick.c.name} (power ${pick.c.power}).`;
      } else {
        state.peekMsg = "Peek: no face-down cards to see yet.";
      }
      return;
    }
    if (card.effect === "swap") {
      const others = [0, 1, 2].filter((i) => i !== laneIndex);
      const target = others[Math.floor(Math.random() * others.length)];
      const tmp = state.lanes[laneIndex][player];
      state.lanes[laneIndex][player] = state.lanes[target][player];
      state.lanes[target][player] = tmp;
      state.peekMsg = `Swap: card moved to Lane ${target + 1}.`;
    }
  }

  function advanceTurn() {
    if (bothPlaced()) {
      resolveBoard();
      return;
    }
    const other = state.turn === "p1" ? "p2" : "p1";
    if (placementsLeft(other) > 0) state.turn = other;
    selectedCardId = null;
    pendingLane = null;
    render();
    maybeAi();
  }

  function commit(faceUp) {
    if (selectedCardId == null || pendingLane === null) return;
    const hand = state.hands[state.turn];
    const idx = hand.findIndex((c) => c.id === selectedCardId);
    if (idx < 0) return;
    const [card] = hand.splice(idx, 1);
    card.faceUp = faceUp;
    card.revealed = faceUp;
    card.powerMod = 0;
    state.lanes[pendingLane][state.turn] = card;
    if (faceUp) applyFaceUpEffect(state.turn, pendingLane, card);
    else state.peekMsg = "";
    el.actions.classList.add("hidden");
    advanceTurn();
  }

  function maybeAi() {
    if (!state || state.mode !== "ai" || state.turn !== "p2" || state.phase !== "place") return;
    setTimeout(aiMove, 420);
  }

  function aiMove() {
    if (!state || state.turn !== "p2" || state.phase !== "place") return;
    const hand = state.hands.p2;
    const empties = emptyLanesFor("p2");
    if (!hand.length || !empties.length) return;
    const card = hand[Math.floor(Math.random() * hand.length)];
    const lane = empties[Math.floor(Math.random() * empties.length)].i;
    const faceUp = card.power >= 4 ? Math.random() < 0.6 : Math.random() < 0.45;
    selectedCardId = card.id;
    pendingLane = lane;
    commit(faceUp);
  }

  function resolveBoard() {
    state.phase = "resolve";
    state.lanes.forEach((l) => {
      if (l.p1) l.p1.revealed = true;
      if (l.p2) l.p2.revealed = true;
    });
    render();

    const laneWins = { p1: 0, p2: 0 };
    let total1 = 0;
    let total2 = 0;
    const details = [];

    state.lanes.forEach((l, i) => {
      const a = l.p1.power + (l.p1.powerMod || 0);
      const b = l.p2.power + (l.p2.powerMod || 0);
      total1 += a;
      total2 += b;
      let winner = "tie";
      if (a > b) {
        laneWins.p1 += 1;
        winner = state.mode === "ai" ? "you" : "P1";
      } else if (b > a) {
        laneWins.p2 += 1;
        winner = state.mode === "ai" ? "AI" : "P2";
      }
      details.push(`L${i + 1} ${a}-${b} (${winner})`);
    });

    let result;
    if (laneWins.p1 >= 2) result = "p1";
    else if (laneWins.p2 >= 2) result = "p2";
    else if (total1 > total2) result = "p1";
    else if (total2 > total1) result = "p2";
    else result = "tie";

    state.scores = { laneWins, total1, total2, details, result };
    setTimeout(showEnd, 650);
  }

  function showEnd() {
    const { result, laneWins, total1, total2, details } = state.scores;
    let title;
    if (result === "tie") title = "Tie — rematch?";
    else if (state.mode === "ai") title = result === "p1" ? "You win!" : "AI wins";
    else title = result === "p1" ? "Player 1 wins!" : "Player 2 wins!";
    el.endTitle.textContent = title;
    el.endDetail.textContent = `Lanes ${laneWins.p1}–${laneWins.p2} · Power ${total1}–${total2}. ${details.join(" · ")}`;
    show("end");
  }

  document.querySelectorAll("[data-mode]").forEach((btn) => {
    btn.addEventListener("click", () => startGame(btn.getAttribute("data-mode")));
  });
  document.getElementById("btn-face-up").addEventListener("click", () => commit(true));
  document.getElementById("btn-face-down").addEventListener("click", () => commit(false));
  document.getElementById("btn-cancel").addEventListener("click", () => {
    selectedCardId = null;
    pendingLane = null;
    el.actions.classList.add("hidden");
    render();
  });
  document.getElementById("btn-rematch").addEventListener("click", () => startGame(state.mode));
  document.getElementById("btn-mode").addEventListener("click", () => show("mode"));
})();
