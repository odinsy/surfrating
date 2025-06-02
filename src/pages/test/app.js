const JSON_BASE_PATH = '../../data/rankings/';
const transliterate = window.slugify;

const app = Vue.createApp({
    data() {
        return {
            currentDiscipline: 'longboard',
            currentCompetition: 'rfs/rus',
            currentGender: 'men',
            currentYear: 'all',
            years: [],
            headers: [],
            tableData: [],
            competitions: {
                shortboard: [
                    { value: 'rfs/rus', label: 'Чемпионат России' },
                    { value: 'rfs/kaliningrad', label: 'Чемпионат Калининградской области' }
                ],
                longboard: [
                    { value: 'rfs/rus', label: 'Чемпионат России' },
                    { value: 'rfs/kaliningrad', label: 'Чемпионат Калининградской области' }
                ],
                wakesurfing: [
                    { value: 'rfs/rus', label: 'Чемпионат России' },
                    { value: 'rfs/federal', label: 'Чемпионат Федеральных округов' }
                ],
                wakeskim: [
                    { value: 'rfs/rus', label: 'Чемпионат России' }
                ]
            }
        };
    },
    computed: {
        currentCategory() {
            return `${this.currentDiscipline}_${this.currentGender}`;
        }
    },
    watch: {
        currentDiscipline() {
            this.updateTable();
        },
        currentCompetition() {
            this.updateTable();
        },
        currentGender() {
            this.updateTable();
        },
        currentYear() {
            this.updateTable();
        }
    },
    methods: {
        async loadData(competition, category, gender) {
            const path = `${JSON_BASE_PATH}${competition}/${category}/ranking_${gender}.json?t=${Date.now()}`;
            try {
                const response = await fetch(path);
                return await response.json();
            } catch (error) {
                console.error('Error loading data:', error);
                return { headers: [], rankings: { year_rankings: {}, overall_ranking: [] } };
            }
        },
        getYearsRange(data) {
            if (!data.rankings.year_rankings) return [];
            const years = new Set(Object.keys(data.rankings.year_rankings));
            return Array.from(years).sort((a, b) => a - b);
        },
        prepareTableData(data) {
            return data.rankings.overall_ranking.map(athlete => {
                const bestResult = athlete.best_result
                    ? `${athlete.best_result.place} в ${athlete.best_result.year}`
                    : 'Нет данных';
                const [surname = '', formatedFirstName = ''] = athlete.name.split(/\s+/);
                const firstName = formatedFirstName.replace(/[()]/g, '');
                const initials = (surname[0] || '') + (firstName[0] || '');
                const avatarSlug = transliterate(surname) + (firstName ? '-' + transliterate(firstName[0]) : '');
                const avatarPath = `../../img/avatars/${avatarSlug}.jpg`;

                const yearsData = {};
                if (this.currentYear === 'all') {
                    data.rankings.year_rankings && Object.keys(data.rankings.year_rankings).forEach(year => {
                        const athleteInYear = data.rankings.year_rankings[year].athletes.find(a => a.name === athlete.name);
                        yearsData[year] = athleteInYear ? {
                            year_total_points: athleteInYear.year_points,
                            events: athleteInYear.events
                        } : {};
                    });
                } else {
                    const athleteInYear = data.rankings.year_rankings?.[this.currentYear]?.athletes.find(a => a.name === athlete.name);
                    yearsData[this.currentYear] = athleteInYear ? {
                        year_total_points: athleteInYear.year_points,
                        events: athleteInYear.events
                    } : {};
                }

                return {
                    rank: athlete.rank,
                    name: athlete.name,
                    sportRank: athlete.sport_rank,
                    birthday: athlete.birthday,
                    region: athlete.region,
                    category: athlete.category,
                    total_points: athlete.total_points || 0,
                    bestResult,
                    initials,
                    avatarPath,
                    years: yearsData
                };
              });
            };
        async updateTable() {
            const data = await this.loadData(this.currentCompetition, this.currentDiscipline, this.currentGender);
            this.headers = data.headers || [];
            this.years = this.currentYear === 'all' ? this.getYearsRange(data) : [this.currentYear];
            this.tableData = this.prepareTableData(data);
        },
        changeDiscipline(discipline) {
            this.currentDiscipline = discipline;
            this.currentCompetition = this.competitions[discipline][0].value;
        },
        changeGender(gender) {
            this.currentGender = gender;
        },
        handleImageError(event) {
            event.target.style.display = 'none';
            event.target.nextElementSibling.style.display = 'flex';
        },
        headerToProp(header) {
            if (this.isYearHeader(header)) return header;
            const propMap = {
                'Rank': 'rank',
                'Name': 'name',
                'Sport Rank': 'sport_rank',
                'Birthday': 'birthday',
                'Region': 'region',
                'Category': 'category',
                'Total Points': 'total_points'
            };
            if (!propMap[header]) {
                console.warn(`No property mapping found for header: ${header}`);
                return undefined;
            }
            return propMap[header];
        },
        isYearHeader(header) {
            return /^\d{4}$/.test(header);
        },
        getColumnWidth(header) {
            if (header === 'Name') return '300';
            if (header === 'Rank') return '60';
            if (header === 'Total Points') return '100';
            if (this.isYearHeader(header)) return '100';
            return '120';
        },
        getTooltipContent(row) {
            return `
                <div class="tooltip-item">
                    <div class="tooltip-header">
                        <div class="tooltip-meta">
                            <div class="tooltip-name">${row.name}</div>
                            <div class="tooltip-region">${row.region}</div>
                        </div>
                        <img src="${row.avatarPath}" class="tooltip-avatar" alt="${row.name}">
                    </div>
                    <div class="tooltip-stats">
                        <div class="tooltip-stat">
                            <div class="tooltip-value">#${row.rank}</div>
                            <div class="tooltip-label">Ранк</div>
                        </div>
                        <div class="tooltip-stat">
                            <div class="tooltip-value">${row.sportRank || '—'}</div>
                            <div class="tooltip-label">Разряд</div>
                        </div>
                        <div class="tooltip-stat">
                            <div class="tooltip-value">${row.bestResult}</div>
                            <div class="tooltip-label">Лучший результат</div>
                        </div>
                    </div>
                    <div class="tooltip-social">
                        <a href="https://topheats.ru" target="_blank">topheats.ru</a>
                    </div>
                </div>
            `;
        },
        getYearTooltipContent(row, year) {
            const yearData = row.years?.[year];
            const events = yearData?.events || [];
            if (!events.length) return '';
            return `
                <div class="custom-tooltip">
                    ${events.map(e => `
                        <div class="tooltip-event">
                            <div class="event-title">${e.name} ${year}</div>
                            <div class="event-detail">Место: ${e.place}</div>
                            <div class="event-detail">Очки: ${e.points}</div>
                        </div>
                    `).join('')}
                </div>
            `;
        }
    },
    mounted() {
        const urlParams = new URLSearchParams(window.location.search);
        const initialCategory = urlParams.get('category') || 'longboard_men';
        const [discipline, gender] = initialCategory.split('_');
        this.currentDiscipline = discipline;
        this.currentGender = gender;
        this.updateTable();
    }
});

app.use(ElementPlus);
app.mount('#app');
