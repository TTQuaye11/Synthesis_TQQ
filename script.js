// ---------- Data (objects and arrays) ----------
const FORMATIONS = {
  "4-3-3": { DEF: 4, MID: 3, FWD: 3 },
  "4-4-2": { DEF: 4, MID: 4, FWD: 2 },
  "4-2-4": { DEF: 4, MID: 2, FWD: 4 },
  "4-5-1": { DEF: 4, MID: 5, FWD: 1 },
  "3-5-2": { DEF: 3, MID: 5, FWD: 2 },
  "3-4-3": { DEF: 3, MID: 4, FWD: 3 },
  "5-3-2": { DEF: 5, MID: 3, FWD: 2 },
  "5-4-1": { DEF: 5, MID: 4, FWD: 1 },
  "5-2-3": { DEF: 5, MID: 2, FWD: 3 }
};

const FORMATION_GROUPS = [
  { title: "4-back formations", formations: ["4-3-3", "4-4-2", "4-2-4", "4-5-1"] },
  { title: "3-back formations", formations: ["3-5-2", "3-4-3"] },
  { title: "5-back formations", formations: ["5-3-2", "5-4-1", "5-2-3"] }
];

const WIDE_FORWARD_FORMATIONS = new Set(["4-3-3", "4-2-4", "3-4-3", "5-2-3"]);

const POSITION_GROUPS = [
  {
    key: "DEF",
    label: "Defenders",
    positions: [
      { code: "RB", label: "Right Back", aliases: ["rightback"] },
      { code: "CB", label: "Centre Back", aliases: ["centerback", "centreback", "centraldefender"] },
      { code: "LB", label: "Left Back", aliases: ["leftback"] }
    ]
  },
  {
    key: "MID",
    label: "Midfielders",
    positions: [
      { code: "CDM", label: "Defensive Midfielder", aliases: ["defensivemidfielder"] },
      { code: "CM", label: "Central Midfielder", aliases: ["centralmidfielder"] },
      { code: "CAM", label: "Attacking Midfielder", aliases: ["attackingmidfielder"] },
      { code: "RM", label: "Right Midfielder", aliases: ["rightmidfielder"], alternates: ["RW"] },
      { code: "LM", label: "Left Midfielder", aliases: ["leftmidfielder"], alternates: ["LW"] }
    ]
  },
  {
    key: "FWD",
    label: "Forwards",
    positions: [
      { code: "RW", label: "Right Winger", aliases: ["rightwinger"], alternates: ["RM"] },
      { code: "LW", label: "Left Winger", aliases: ["leftwinger"], alternates: ["LM"] },
      { code: "ST", label: "Striker", aliases: ["striker"] }
    ]
  }
];

const POSITION_LABELS = Object.fromEntries([
  ["GK", "Goalkeeper"],
  ...POSITION_GROUPS.flatMap(group => group.positions.map(position => [position.code, position.label]))
]);
const FIELD_POSITION_ORDER = {
  DEF: ["LB", "CB", "RB"],
  MID: ["LM", "CDM", "CM", "CAM", "RM"],
  FWD: ["LW", "ST", "RW"]
};
const SHIRT_NUMBER_PREFERENCES = {
  RB: [2, 7, 6],
  CB: [4, 5, 3, 6],
  LB: [3, 2, 6],
  CDM: [6, 4, 8],
  CM: [8, 6, 10],
  CAM: [10, 8, 7],
  RM: [7, 11, 8],
  LM: [11, 7, 8],
  RW: [7, 11, 8],
  LW: [11, 7, 8],
  ST: [9, 10, 11]
};
const POSITION_ALIASES = Object.fromEntries([
  ["GK", ["GK", "goalkeeper"]],
  ...POSITION_GROUPS.flatMap(group => group.positions.map(position => [
    position.code,
    [position.code, ...position.aliases]
  ]))
].flatMap(([code, aliases]) => aliases.map(alias => [
  alias.toUpperCase().replace(/[\s_-]/g, ""),
  code
])));
const EMPTY_PLAYERS = Object.fromEntries([
  ["GK", []],
  ...POSITION_GROUPS.flatMap(group => group.positions.map(position => [position.code, []]))
]);
let PLAYERS = { ...EMPTY_PLAYERS };
const LABELS = Object.fromEntries(POSITION_GROUPS.map(group => [group.key, group.label]));

// Current choices
const selected = { DEF: [], MID: [], FWD: [] };
const selectedPosition = { DEF: {}, MID: {}, FWD: {} };
let formation = "4-3-3";

// ---------- DOM references ----------
const squadInput = document.getElementById("squad-input");
const loadSquadBtn = document.getElementById("load-squad");
const squadMsg = document.getElementById("squad-msg");
const formationsBox = document.getElementById("formations");
const gkSelect = document.getElementById("gk");
const groupsBox = document.getElementById("groups");
const createBtn = document.getElementById("create");
const msg = document.getElementById("msg");
const out = document.getElementById("out");
const summary = document.getElementById("summary");

// ---------- Build the controls ----------
function escapeHtml(value) {
  return value.replace(/[&<>"']/g, character => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[character]);
}

function parseSquad(text) {
  const players = Object.fromEntries(Object.keys(EMPTY_PLAYERS).map(position => [position, []]));
  const names = new Map();
  const lines = text.split(/\r?\n/);

  for (let index = 0; index < lines.length; index++) {
    const line = lines[index].trim();
    if (!line) continue;

    const parts = line.split(",").map(part => part.trim());
    if (parts.length < 2 || parts.some(part => !part)) {
      return { error: `Line ${index + 1}: enter a player as Name, Position, Position.` };
    }

    const name = parts[0];
    const positions = parts.slice(1).map(position =>
      POSITION_ALIASES[position.toUpperCase().replace(/[\s_-]/g, "")]
    );
    if (positions.some(position => !position)) {
      return { error: `Line ${index + 1}: use positions such as GK, CB, CDM, RW, or ST.` };
    }

    const normalizedName = name.toLocaleLowerCase();
    let playerName = names.get(normalizedName);
    if (!playerName) {
      playerName = name;
      names.set(normalizedName, playerName);
    }

    for (const position of new Set(positions)) {
      if (!players[position].includes(playerName)) players[position].push(playerName);
    }
  }

  if (names.size === 0) {
    return { error: "Enter at least one player before loading the squad." };
  }
  if (players.GK.length === 0) {
    return { error: "Add at least one goalkeeper (GK) to the squad." };
  }

  const outfieldPlayers = Object.entries(players)
    .filter(([position]) => position !== "GK")
    .flatMap(([, positionPlayers]) => positionPlayers);
  const goalkeeperPlayingOutfield = players.GK.find(name => outfieldPlayers.includes(name));
  if (goalkeeperPlayingOutfield) {
    return { error: `${goalkeeperPlayingOutfield} cannot be listed as a goalkeeper and an outfield player.` };
  }

  return { players };
}

function renderFormations() {
  formationsBox.innerHTML = FORMATION_GROUPS.map(group => `
    <div class="formation-group">
      <div class="formation-group-title">${group.title}</div>
      <div class="formation-options">
        ${group.formations.map(f => `
          <label>
            <input type="radio" name="formation" value="${f}" ${f === formation ? "checked" : ""}>
            <span>${f}</span>
          </label>`).join("")}
      </div>
    </div>`).join("");
}

function renderGoalkeepers() {
  gkSelect.innerHTML =
    `<option value="">Choose a goalkeeper</option>` +
    PLAYERS.GK.map(name => `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`).join("");
}

function getPositionCodes(name) {
  const codes = [];
  for (const group of POSITION_GROUPS) {
    for (const position of group.positions) {
      if (PLAYERS[position.code].includes(name)) codes.push(position.code);
    }
  }
  return codes;
}

function getFormationPositionCode(name, groupKey) {
  return selectedPosition[groupKey][name] || getPositionCodes(name)[0] || "";
}

function isPositionAvailable(positionCode) {
  const wideForwards = WIDE_FORWARD_FORMATIONS.has(formation);
  if (["RM", "LM"].includes(positionCode)) return !wideForwards;
  if (["RW", "LW"].includes(positionCode)) return wideForwards;
  return true;
}

function moveWideSelections(targetGroup, sourceGroup, sourcePositions, targetPositions) {
  const moving = selected[sourceGroup].filter(name =>
    sourcePositions.includes(selectedPosition[sourceGroup][name])
  );
  selected[sourceGroup] = selected[sourceGroup].filter(name => !moving.includes(name));
  for (const name of moving) {
    const sourcePosition = selectedPosition[sourceGroup][name];
    delete selectedPosition[sourceGroup][name];
    if (!selected[targetGroup].includes(name)) selected[targetGroup].push(name);
    selectedPosition[targetGroup][name] = targetPositions[sourcePositions.indexOf(sourcePosition)];
  }
}

function renderPositionRow(groupKey, names, token, usedNumbers) {
  const players = names
    .map((name, index) => ({
      name,
      index,
      positionCode: getFormationPositionCode(name, groupKey)
    }))
    .sort((a, b) => {
      const order = FIELD_POSITION_ORDER[groupKey];
      const aRank = order.indexOf(a.positionCode);
      const bRank = order.indexOf(b.positionCode);
      return (aRank === -1 ? order.length : aRank) - (bRank === -1 ? order.length : bRank) ||
        a.index - b.index;
    });

  return players.map(player => {
    const preferences = SHIRT_NUMBER_PREFERENCES[player.positionCode] || [];
    const shirtNumber = [...preferences, ...Array.from({ length: 10 }, (_, index) => index + 2)]
      .find(number => !usedNumbers.has(number));
    usedNumbers.add(shirtNumber);
    return token(player.name, player.positionCode, shirtNumber);
  }).join("");
}

function renderGroups() {
  if (Object.values(PLAYERS).every(players => players.length === 0)) {
    groupsBox.innerHTML = "<p class=\"squad-empty\">Load a squad list above to populate player selection.</p>";
    return;
  }

  const need = FORMATIONS[formation];

  groupsBox.innerHTML = POSITION_GROUPS.map(group => {
    const full = selected[group.key].length >= need[group.key];
    const roles = group.positions.filter(position => isPositionAvailable(position.code)).map(position => {
      const eligiblePlayers = [
        ...PLAYERS[position.code],
        ...(position.alternates || []).flatMap(code => PLAYERS[code])
      ];
      const boxes = [...new Set(eligiblePlayers)].map(name => {
        const checked = selected[group.key].includes(name) &&
          selectedPosition[group.key][name] === position.code;
        const selectedElsewhere = Object.keys(selected).some(key =>
          selected[key].includes(name) &&
          (key !== group.key || selectedPosition[key][name] !== position.code)
        );
        const isGoalkeeper = gkSelect.value === name;
        const locked = (full && !checked) || selectedElsewhere || isGoalkeeper;
        return `
          <label class="${locked ? "off" : ""}">
            <input type="checkbox" data-pos="${group.key}" data-role="${position.code}" value="${escapeHtml(name)}"
                   ${checked ? "checked" : ""} ${locked ? "disabled" : ""}>
            ${escapeHtml(name)}
          </label>`;
      }).join("");

      if (!boxes) return "";
      return `
        <div class="position-group">
          <h3>${position.label} <span>${position.code}</span></h3>
          <div class="opts">${boxes}</div>
        </div>`;
    }).join("");

    return `
      <fieldset>
        <legend>${group.label}<small>${selected[group.key].length} of ${need[group.key]}</small></legend>
        ${roles || "<p class=\"squad-empty\">No players at these positions in the loaded squad.</p>"}
      </fieldset>`;
  }).join("");
}

// ---------- Events ----------
loadSquadBtn.addEventListener("click", () => {
  const result = parseSquad(squadInput.value);
  if (result.error) {
    squadMsg.dataset.state = "error";
    squadMsg.textContent = result.error;
    return;
  }

  PLAYERS = result.players;
  selected.DEF = [];
  selected.MID = [];
  selected.FWD = [];
  selectedPosition.DEF = {};
  selectedPosition.MID = {};
  selectedPosition.FWD = {};
  gkSelect.value = "";
  renderGoalkeepers();
  renderGroups();
  out.className = "empty";
  out.innerHTML = "<p>Your lineup will appear here.<br>Choose players and select Create team.</p>";
  summary.textContent = "";
  msg.textContent = "";
  squadMsg.dataset.state = "success";
  const playerCount = new Set(Object.values(PLAYERS).flat()).size;
  squadMsg.textContent = `${playerCount} players loaded. Previous selections were cleared.`;
});

formationsBox.addEventListener("change", e => {
  formation = e.target.value;
  const need = FORMATIONS[formation];
  const wideForwards = WIDE_FORWARD_FORMATIONS.has(formation);

  if (wideForwards) {
    moveWideSelections("FWD", "MID", ["RM", "LM"], ["RW", "LW"]);
  } else {
    moveWideSelections("MID", "FWD", ["RW", "LW"], ["RM", "LM"]);
  }

  // Trim picks if the new formation has fewer slots in a position
  for (const pos in selected) {
    selected[pos] = selected[pos].slice(0, need[pos]);
    for (const name of Object.keys(selectedPosition[pos])) {
      if (!selected[pos].includes(name)) delete selectedPosition[pos][name];
    }
  }
  msg.textContent = "";
  renderGroups();
});

groupsBox.addEventListener("change", e => {
  const pos = e.target.dataset.pos;
  if (!pos) return;

  if (e.target.checked) {
    selected[pos].push(e.target.value);
    selectedPosition[pos][e.target.value] = e.target.dataset.role;
  } else {
    selected[pos] = selected[pos].filter(name => name !== e.target.value);
    delete selectedPosition[pos][e.target.value];
  }
  msg.textContent = "";
  renderGroups();
});

gkSelect.addEventListener("change", () => {
  for (const pos of Object.keys(selected)) {
    if (selected[pos].includes(gkSelect.value)) {
      selected[pos] = selected[pos].filter(name => name !== gkSelect.value);
      delete selectedPosition[pos][gkSelect.value];
    }
  }
  renderGroups();
});

createBtn.addEventListener("click", () => {
  const need = FORMATIONS[formation];
  const missingParts = [];

  if (!gkSelect.value) missingParts.push("a goalkeeper");

  for (const pos in need) {
    const missing = need[pos] - selected[pos].length;
    if (missing > 0) {
      missingParts.push(`${missing} more ${LABELS[pos].toLowerCase()}`);
    }
  }

  if (missingParts.length > 0) {
    msg.textContent = "Still needed: " + missingParts.join(", ") + ".";
    return;
  }

  msg.textContent = "";
  showPitch();
});

// ---------- Show the starting XI ----------
function showPitch() {
  const usedNumbers = new Set([1]);

  function token(name, positionCode, shirtNumber, extraClass = "") {
    return `
      <div class="p ${extraClass}">
        <div class="shirt">${shirtNumber}</div>
        ${escapeHtml(name)}
        <small class="position-tag">${positionCode} · ${POSITION_LABELS[positionCode]}</small>
      </div>`;
  }

  const gkHtml = token(gkSelect.value, "GK", 1, "gk");
  const defHtml = renderPositionRow("DEF", selected.DEF, token, usedNumbers);
  const midHtml = renderPositionRow("MID", selected.MID, token, usedNumbers);
  const fwdHtml = renderPositionRow("FWD", selected.FWD, token, usedNumbers);

  // Forwards at the top, goalkeeper at the bottom
  out.className = "pitch";
  out.innerHTML = `
    <div class="row">${fwdHtml}</div>
    <div class="row">${midHtml}</div>
    <div class="row">${defHtml}</div>
    <div class="row">${gkHtml}</div>`;

  summary.textContent = "Formation " + formation;
}

// ---------- Start ----------
renderFormations();
renderGoalkeepers();
renderGroups();
