const JSON_BASE_PATH = '../../data/rankings/';
const transliterate = window.slugify;

const DISCIPLINE_COMPETITIONS = {
    shortboard: {
        'Чемпионат России': 'rfs/rus',
        'Чемпионат Калининградской области': 'rfs/kaliningrad'
    },
    longboard: {
        'Чемпионат России': 'rfs/rus',
        'Чемпионат Калининградской области': 'rfs/kaliningrad'
    },
    wakesurfing: {
        'Чемпионат России': 'rfs/rus',
    },
    wakeskim: {
        'Чемпионат России': 'rfs/rus'
    }
};

let currentDiscipline = 'shortboard';
let currentCompetition = 'rfs/rus';

function getYearsRange(data) {
    if (!data.athletes) return [];
    const years = new Set();
    data.athletes.forEach(athlete => {
        if (athlete.years) Object.keys(athlete.years).forEach(year => years.add(year));
    });
    return Array.from(years).sort((a, b) => a - b);
}

function createAthleteRow(athlete, years) {
    const bestResult = athlete.best_result
        ? `${athlete.best_result.place} в ${athlete.best_result.event_year}`
        : 'Нет данных';

    const [surname = '', firstName = ''] = athlete.name.split(/\s+/);
    const initials = (surname[0] || '') + (firstName[0] || '');
    const avatarSlug = transliterate(surname) + (firstName ? '-' + transliterate(firstName[0]) : '');
    const avatarPath = `../../img/avatars/${avatarSlug}.jpg`;

    const yearCells = years.map(year => {
        const yearData = athlete.years?.[year];
        const events = yearData?.events || [];
        const tooltipId = `tooltip-${athlete.rank}-${year}`;

        const tooltipHTML = events.length
            ? `<div class="custom-tooltip" id="${tooltipId}">
                ${events.map(e => `
                    <div class="tooltip-event">
                        <div class="event-title">${e.event_name} ${year}</div>
                        <div class="event-detail">Место: ${e.place}</div>
                        <div class="event-detail">Очки: ${e.points}</div>
                    </div>
                `).join('')}
               </div>`
            : '';

        return `
            <td class="year-points"
                onmouseenter="showTooltip('${tooltipId}')"
                onmouseleave="hideTooltip('${tooltipId}')">
                ${yearData?.year_total_points || '—'}
                ${tooltipHTML}
            </td>
        `;
    }).join('');

    return `
        <tr>
            <td>${athlete.rank}</td>
            <td class="name-cell">
                <div class="avatar-wrapper">
                    <div class="athlete-avatar">
                        <img src="${avatarPath}" alt="${athlete.name}"
                             onerror="this.style.display='none'; this.nextElementSibling.style.display='flex'">
                        <div class="avatar-fallback">${initials}</div>
                    </div>
                    <div>
                        <div class="athlete-name">${athlete.name}</div>
                        <div class="athlete-region">${athlete.region}</div>
                    </div>
                </div>
            </td>
            <td class="year-points">${bestResult}</td>
            ${yearCells}
            <td class="total-points">${athlete.total_points}</td>
        </tr>
    `;
}

async function loadData(competition, category, gender) {
    const path = `${JSON_BASE_PATH}${competition}/${category}/${gender}.json?t=${Date.now()}`;
    try {
        const response = await fetch(path);
        return await response.json();
    } catch (error) {
        console.error('Error loading data:', error);
        return { headers: [], athletes: [] };
    }
}

async function updateTable(category, gender) {
    const data = await loadData(currentCompetition, category, gender);

    if (!data || !data.athletes) {
        document.getElementById('ranking-table-container').innerHTML = '<p>Нет данных для отображения</p>';
        return;
    }

    const years = getYearsRange(data);
    const tableHTML = `
        <table class="ranking-table">
            <thead>
                <tr>
                    <th>#</th>
                    <th>Name</th>
                    <th>Best</th>
                    ${years.map(year => `<th>${year}</th>`).join('')}
                    <th>Total</th>
                </tr>
            </thead>
            <tbody>
                ${data.athletes.map(a => createAthleteRow(a, years)).join('')}
            </tbody>
        </table>
    `;

    document.getElementById('ranking-table-container').innerHTML = tableHTML;
}

function showTooltip(id) {
    const tooltip = document.getElementById(id);
    if (tooltip) tooltip.style.display = 'block';
}

function hideTooltip(id) {
    const tooltip = document.getElementById(id);
    if (tooltip) tooltip.style.display = 'none';
}

function updateCompetitionSelect(discipline) {
    const competitionSelect = document.getElementById('competition-select');
    competitionSelect.innerHTML = '';

    const competitions = DISCIPLINE_COMPETITIONS[discipline];
    for (const [name, value] of Object.entries(competitions)) {
        const option = document.createElement('option');
        option.value = value;
        option.textContent = name;
        competitionSelect.appendChild(option);
    }

    currentCompetition = Object.values(competitions)[0];
}

function updateSelectedDiscipline(discipline) {
    document.querySelectorAll('.discipline-option').forEach(option => {
        option.classList.remove('selected');
    });

    const selectedOption = document.querySelector(`.discipline-option[data-discipline="${discipline}"]`);
    if (selectedOption) {
        selectedOption.classList.add('selected');
        document.querySelector('.discipline-label').textContent = selectedOption.textContent;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const initialCategory = urlParams.get('category') || 'shortboard_men';
    const [category, gender] = initialCategory.split('_');

    document.querySelector(`.gender-btn[data-gender="${gender}"]`).classList.add('active');
    updateCompetitionSelect(currentDiscipline);
    updateSelectedDiscipline(currentDiscipline);

    document.getElementById('competition-select').addEventListener('change', (e) => {
        currentCompetition = e.target.value;
        const gender = document.querySelector('.gender-btn.active').dataset.gender;
        updateTable(currentDiscipline, gender);
    });

    document.querySelectorAll('.discipline-option').forEach(item => {
        item.addEventListener('click', function() {
            const discipline = this.dataset.discipline;
            currentDiscipline = discipline;
            updateCompetitionSelect(discipline);
            updateTable(discipline, document.querySelector('.gender-btn.active').dataset.gender);
            updateSelectedDiscipline(discipline);
        });
    });

    document.querySelectorAll('.gender-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.gender-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            updateTable(currentDiscipline, btn.dataset.gender);
        });
    });

    updateTable(currentDiscipline, gender);
});
