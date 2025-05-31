const { createApp, ref, reactive, computed, watch } = Vue;

createApp({
    setup() {
        // Состояния приложения
        const selectedDiscipline = ref('longboard');
        const selectedRegion = ref('rus');
        const selectedGender = ref('women');
        const selectedYear = ref(null);
        const activeTab = ref('year');
        const rankingData = ref(null);
        const loading = ref(false);

        const JSON_BASE_PATH = '../../data/rankings/';

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
            if (!rankingData.value || !rankingData.value.year_rankings) return [];
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
                return `${JSON_BASE_PATH}/rus/${selectedDiscipline.value}/ranking_${selectedGender.value}.json`;
            }
            return `${JSON_BASE_PATH}/kaliningrad/${selectedDiscipline.value}/${selectedGender.value}.json`;
        });

        // Загрузка данных
        const fetchData = async () => {
            loading.value = true;
            try {
                const response = await fetch(dataPath.value);
                rankingData.value = await response.json();

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

        // Реакция на смену года
        watch(selectedYear, (newYear) => {
            if (newYear && activeTab.value === 'year') {
                fetchData();
            }
        });

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
