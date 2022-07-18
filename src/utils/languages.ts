import i18next from 'i18next';

i18next.init({
    lng: 'ru',
    resources: {
        ru: {
            plurals: {
                every_one: 'каждый',
                every_other: 'каждые',
                hours_0: '{{count}} час',
                hours_1: '{{count}} часа',
                hours_2: '{{count}} часов',
                days_0: '{{count}} день',
                days_1: '{{count}} дня',
                days_2: '{{count}} дней',
            },
        },
    },
});
