const { createApp, ref, reactive, computed, watch } = Vue;

createApp({
    setup() {
        // Состояния приложения
        const selectedDiscipline = ref('wakesurfing');
        const selectedRegion = ref('rus');
        const selectedGender = ref('men');
        const selectedYear = ref('2024');
        const activeTab = ref('year');
        const rankingData = ref(null);
        const loading = ref(false);

        // Константные данные
        const disciplines = [
            { value: 'shortboard', label: 'Шортборд' },
            { value: 'longboard', label: 'Лонгборд' },
            { value: 'wakesurfing', label: 'Вейксерфинг' },
            { value: 'wakeskim', label: 'Вейкским' }
        ];

        const regions = [
            { value: 'rus', label: 'Россия' },
            { value: 'kaliningrad', label: 'Калининград' }
        ];

        // Доступные годы (вычисляется динамически)
        const availableYears = computed(() => {
            if (!rankingData.value || !rankingData.value.year_rankings) return ['2024', '2023'];
            return Object.keys(rankingData.value.year_rankings).sort().reverse();
        });

        // Данные для текущего года
        const currentYearData = computed(() => {
            if (!rankingData.value || !selectedYear.value) return [];
            return rankingData.value.year_rankings[selectedYear.value]?.athletes || [];
        });

        // Общий рейтинг
        const overallRanking = computed(() => {
            if (!rankingData.value) return [];
            return rankingData.value.overall_ranking || [];
        });

        // Путь к данным
        const dataPath = computed(() => {
            if (selectedRegion.value === 'rus') {
                return `data/rankings/rus/${selectedDiscipline.value}/ranking_${selectedGender.value}.json`;
            }
            return `data/rankings/kaliningrad/${selectedDiscipline.value}/${selectedGender.value}.json`;
        });

        // Загрузка данных
        const fetchData = async () => {
            loading.value = true;
            try {
                // Имитация загрузки данных
                await new Promise(resolve => setTimeout(resolve, 800));

                // В реальном приложении:
                // const response = await fetch(dataPath.value);
                // rankingData.value = await response.json();

                // Заглушка данных
                rankingData.value = {
                    year_rankings: {
                        "2024": {
                            athletes: [
                                {
                                    rank: 1,
                                    name: "Иванов Алексей",
                                    year_points: 10000,
                                    total_points: 38230,
                                    events: [
                                        {
                                            name: "Чемпионат России",
                                            place: 1,
                                            points: 10000,
                                            group: "main",
                                            participants_count: 26
                                        }
                                    ]
                                },
                                {
                                    rank: 2,
                                    name: "Петров Дмитрий",
                                    year_points: 7800,
                                    total_points: 35255,
                                    events: [
                                        {
                                            name: "Чемпионат России",
                                            place: 2,
                                            points: 7800,
                                            group: "main",
                                            participants_count: 26
                                        },
                                        {
                                            name: "Кубок Калининграда",
                                            place: 1,
                                            points: 5000,
                                            group: "main",
                                            participants_count: 18
                                        }
                                    ]
                                }
                            ]
                        },
                        "2023": {
                            athletes: [
                                {
                                    rank: 1,
                                    name: "Сидоров Михаил",
                                    year_points: 9500,
                                    total_points: 36240,
                                    events: [
                                        {
                                            name: "Чемпионат России 2023",
                                            place: 1,
                                            points: 9500,
                                            group: "main",
                                            participants_count: 24
                                        }
                                    ]
                                }
                            ]
                        }
                    },
                    overall_ranking: [
                        {
                            rank: 1,
                            name: "Иванов Алексей",
                            region: "Калининградская область",
                            sport_rank: "КМС",
                            birthday: 1995,
                            total_points: 38230,
                            best_result: {
                                event: "Чемпионат России",
                                year: "2024",
                                place: 1,
                                points: 10000
                            }
                        },
                        {
                            rank: 2,
                            name: "Петров Дмитрий",
                            region: "Московская область",
                            sport_rank: "КМС",
                            birthday: 1998,
                            total_points: 35255,
                            best_result: {
                                event: "Кубок Калининграда",
                                year: "2023",
                                place: 1,
                                points: 5000
                            }
                        }
                    ]
                };

                // Установка года по умолчанию
                if (availableYears.value.length > 0 && !selectedYear.value) {
                    selectedYear.value = availableYears.value[0];
                }
            } catch (error) {
                console.error('Ошибка загрузки данных:', error);
            } finally {
                loading.value = false;
            }
        };

        // Отслеживание изменений параметров
        watch([selectedDiscipline, selectedRegion, selectedGender], fetchData, { immediate: true });

        return {
            selectedDiscipline,
            selectedRegion,
            selectedGender,
            selectedYear,
            activeTab,
            rankingData,
            loading,
            disciplines,
            regions,
            availableYears,
            currentYearData,
            overallRanking
        };
    }
}).use(ElementPlus).mount('#app');
