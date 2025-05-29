function domReady(fn) {
    if (document.readyState !== 'loading') {
        fn();
    } else {
        document.addEventListener('DOMContentLoaded', fn);
    }
}

domReady(function() {
    const JSON_BASE_PATH = '../../data/rankings/';
    const transliterate = window.slugify;

    // Текущие параметры
    let currentSport = 'surfing';
    let currentDiscipline = 'shortboard';
    let currentCompetition = 'rfs/rus';

    // Основная инициализация
    const urlParams = new URLSearchParams(window.location.search);
    const initialSport = urlParams.get('sport') || 'surfing';
    const initialDiscipline = urlParams.get('discipline') || 'shortboard';
    const initialCompetition = urlParams.get('competition') || 'rfs/rus';
    const initialGender = urlParams.get('gender') || 'men';

    currentSport = initialSport;
    currentDiscipline = initialDiscipline;
    currentCompetition = initialCompetition;

    // Обновляем текст кнопки меню
    function updateSportMenuButton() {
        const disciplineName = getDisciplineName(currentDiscipline);
        document.querySelector('.sport-menu-btn').innerHTML = `${disciplineName} ▼`;
    }

    function getDisciplineName(discipline) {
        const names = {
            'shortboard': 'Короткая доска',
            'longboard': 'Длинная доска',
            'wakesurfing': 'Вейксерфинг',
            'wakeskim': 'Вейкским'
        };
        return names[discipline] || 'Рейтинг';
    }

    function getYearsRange(data) {
        if (!data.athletes) return [];
        const years = new Set();
        data.athletes.forEach(athlete => {
            if (athlete.years) {
                Object.keys(athlete.years).forEach(year => years.add(year));
            }
        });
        return Array.from(years).sort((a, b) => b - a); // Сортировка от нового к старому
    }

    function createAthleteRow(athlete, years) {
        const bestResult = athlete.best_result
            ? `${athlete.best_result.place} в ${athlete.best_result.year}`
            : 'Нет данных';

        const [surname = '', firstName = ''] = athlete.name.split(/\s+/);
        const initials = (surname[0] || '') + (firstName[0] || '');
        const avatarSlug = transliterate(surname) + (firstName ? '-' + transliterate(firstName[0]) : '');
        const avatarPath = `../../img/avatars/${currentSport}/${currentDiscipline}/${avatarSlug}.jpg`;

        const yearCells = years.map(year => {
            const yearData = athlete.years?.[year];
            const events = yearData?.events || [];
            const tooltipId = `tooltip-${athlete.rank}-${year}`;

            const tooltipHTML = events.length
                ? `<div class="custom-tooltip" id="${tooltipId}">
                    ${events.map(e => `
                        <div class="tooltip-event">
                            <div class="event-title">${e.name} ${year}</div>
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
            <tr class="${athlete.rank <= 10 ? 'top-athlete' : ''}">
                <td>${athlete.rank}</td>
                <td class="name-cell">
                    <div class="avatar-wrapper">
                        <div class="athlete-avatar">
                            <img src="${avatarPath}"
                                 alt="${athlete.name}"
                                 onerror="this.style.display='none';
                                          this.nextElementSibling.style.display='flex'">
                            <div class="avatar-fallback">${initials}</div>
                        </div>
                        <div>
                            <div class="athlete-name">${athlete.name}</div>
                            <div class="athlete-region">${athlete.region}</div>
                        </div>
                    </div>

                    <div class="tooltip-item">
                        <div class="tooltip-header">
                            <div class="tooltip-meta">
                                <div class="tooltip-name">${athlete.name}</div>
                                <div class="tooltip-region">${athlete.region}</div>
                            </div>
                            <img src="${avatarPath}"
                                 class="tooltip-avatar"
                                 alt="${athlete.name}"
                                 onerror="this.style.display='none'">
                        </div>

                        <div class="tooltip-stats">
                            <div class="tooltip-stat">
                                <div class="tooltip-value">#${athlete.rank}</div>
                                <div class="tooltip-label">Ранк</div>
                            </div>
                            <div class="tooltip-stat">
                                <div class="tooltip-value">${athlete.sport_rank || '—'}</div>
                                <div class="tooltip-label">Разряд</div>
                            </div>
                            <div class="tooltip-stat">
                                <div class="tooltip-value">${bestResult}</div>
                                <div class="tooltip-label">Лучший результат</div>
                            </div>
                        </div>

                        <div class="tooltip-social">
                            <a href="https://topheats.ru" target="_blank">topheats.ru</a>
                        </div>
                    </div>
                </td>
                <td class="year-points">
                    ${bestResult}
                </td>
                ${yearCells}
                <td class="total-points">${athlete.total_points}</td>
            </tr>
        `;
    }

    async function loadData(sport, competition, discipline, gender) {
        const path = `${JSON_BASE_PATH}${sport}/${competition}/${discipline}/${gender}.json?t=${Date.now()}`;
        try {
            const response = await fetch(path);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error('Error loading data:', error);
            console.error('Full path:', path);
            return { headers: [], athletes: [] };
        }
    }

    async function updateTable(sport, competition, discipline, gender) {
        document.getElementById('ranking-table-container').innerHTML = `
            <div style="padding: 20px; background: white; border-radius: 8px; margin-top: 20px;">
                <h3>Загрузка данных...</h3>
                <p>Спорт: ${sport}</p>
                <p>Дисциплина: ${discipline}</p>
                <p>Соревнование: ${competition}</p>
                <p>Пол: ${gender}</p>
            </div>
        `;

        try {
            const data = await loadData(sport, competition, discipline, gender);

            if (!data || !data.athletes || data.athletes.length === 0) {
                document.getElementById('ranking-table-container').innerHTML = `
                    <div class="error-message">
                        <p>Нет данных для отображения</p>
                        <p>Проверьте путь: ${JSON_BASE_PATH}${sport}/${competition}/${discipline}/${gender}.json</p>
                    </div>
                `;
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
        } catch (error) {
            console.error('Error updating table:', error);
            document.getElementById('ranking-table-container').innerHTML = `
                <div class="error-message">
                    <p>Произошла ошибка при загрузке данных</p>
                    <p>${error.message}</p>
                </div>
            `;
        }
    }

    function showTooltip(id) {
        const tooltip = document.getElementById(id);
        if (tooltip) tooltip.style.display = 'block';
    }

    function hideTooltip(id) {
        const tooltip = document.getElementById(id);
        if (tooltip) tooltip.style.display = 'none';
    }

    function updateURL() {
        const url = new URL(window.location);
        url.searchParams.set('sport', currentSport);
        url.searchParams.set('discipline', currentDiscipline);
        url.searchParams.set('competition', currentCompetition);
        url.searchParams.set('gender', document.querySelector('.gender-btn.active').dataset.gender);
        window.history.replaceState(null, '', url);
    }

    // Инициализация кнопки меню
    updateSportMenuButton();

    // Установка активной кнопки пола
    const genderBtnActive = document.querySelector(`.gender-btn[data-gender="${initialGender}"]`);
    if (genderBtnActive) {
        document.querySelectorAll('.gender-btn').forEach(b => b.classList.remove('active'));
        genderBtnActive.classList.add('active');
    }

    // Обработчики событий
    // 1. Для кнопок переключения пола
    document.querySelectorAll('.gender-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.gender-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            updateURL();
            updateTable(currentSport, currentCompetition, currentDiscipline, this.dataset.gender);
        });
    });

    // 2. Для выпадающего меню соревнований
    document.querySelectorAll('.competition-item').forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();

            currentSport = this.closest('.sport-group').dataset.sport;
            currentDiscipline = this.dataset.discipline;
            currentCompetition = this.dataset.competition;

            // Обновляем кнопку меню
            updateSportMenuButton();

            updateURL();
            const gender = document.querySelector('.gender-btn.active').dataset.gender;
            updateTable(currentSport, currentCompetition, currentDiscipline, gender);
        });
    });

    // Первоначальная загрузка таблицы
    updateTable(currentSport, currentCompetition, currentDiscipline, initialGender);
});
