import type { Design, ExpectedDirection, MetricKind } from './types';

export type TemplateCategory = 'sleep' | 'energy' | 'focus' | 'mood' | 'body';

export interface L10n {
  fr: string;
  en: string;
}

export interface TemplateMetric {
  id: string;
  name: L10n;
  kind: MetricKind;
  unit?: L10n;
  higherIsBetter: boolean;
}

export interface Template {
  id: string;
  category: TemplateCategory;
  title: L10n;
  question: L10n;
  hypothesis: L10n;
  conditionA: { label: L10n; instructions: L10n };
  conditionB: { label: L10n; instructions: L10n };
  metrics: TemplateMetric[];
  primaryMetricId: string;
  durationDays: number;
  design: Design;
  blockSize: number;
  minEffect: number;
  expectedDirection: ExpectedDirection;
  checkInTime: string;
}

const scale = (id: string, fr: string, en: string, higherIsBetter = true): TemplateMetric => ({
  id,
  name: { fr, en },
  kind: 'scale',
  higherIsBetter,
});

export const TEMPLATES: Template[] = [
  {
    id: 'coffee-afternoon',
    category: 'sleep',
    title: { fr: 'Café après 14 h et sommeil', en: 'Coffee after 2 pm and sleep' },
    question: { fr: 'Le café après 14 h dégrade-t-il mon sommeil ?', en: 'Does coffee after 2 pm hurt my sleep?' },
    hypothesis: { fr: 'Sans café après 14 h, je dors mieux et je m’endors plus vite.', en: 'Without coffee after 2 pm, I sleep better and fall asleep faster.' },
    conditionA: {
      label: { fr: 'Café comme d’habitude', en: 'Coffee as usual' },
      instructions: { fr: 'Buvez votre café (ou thé) normalement, y compris l’après-midi.', en: 'Drink your coffee (or tea) as usual, afternoon included.' },
    },
    conditionB: {
      label: { fr: 'Pas de café après 14 h', en: 'No coffee after 2 pm' },
      instructions: { fr: 'Aucune boisson caféinée après 14 h (café, thé, cola, boissons énergisantes).', en: 'No caffeinated drink after 2 pm (coffee, tea, cola, energy drinks).' },
    },
    metrics: [
      scale('sleep', 'Qualité du sommeil (au réveil le lendemain)', 'Sleep quality (next morning)'),
      { id: 'latency', name: { fr: 'Temps pour m’endormir', en: 'Time to fall asleep' }, kind: 'duration', higherIsBetter: false },
    ],
    primaryMetricId: 'sleep',
    durationDays: 21,
    design: 'blocked-random',
    blockSize: 2,
    minEffect: 1,
    expectedDirection: 'B_higher',
    checkInTime: '08:30',
  },
  {
    id: 'screens-bedtime',
    category: 'sleep',
    title: { fr: 'Écrans avant le coucher', en: 'Screens before bed' },
    question: { fr: 'Couper les écrans une heure avant le coucher améliore-t-il mon sommeil ?', en: 'Does switching screens off an hour before bed improve my sleep?' },
    hypothesis: { fr: 'Sans écran dans l’heure qui précède, je m’endors plus vite.', en: 'With no screen in the last hour, I fall asleep faster.' },
    conditionA: {
      label: { fr: 'Écrans libres', en: 'Screens allowed' },
      instructions: { fr: 'Utilisez téléphone, tablette ou télévision comme d’habitude jusqu’au coucher.', en: 'Use phone, tablet or TV as usual until bedtime.' },
    },
    conditionB: {
      label: { fr: 'Aucun écran 1 h avant', en: 'No screens 1 h before' },
      instructions: { fr: 'Aucun écran pendant l’heure qui précède le coucher. Lecture papier, musique, discussion.', en: 'No screen during the hour before bed. Paper reading, music, conversation.' },
    },
    metrics: [
      { id: 'latency', name: { fr: 'Temps pour m’endormir', en: 'Time to fall asleep' }, kind: 'duration', higherIsBetter: false },
      scale('rested', 'Sensation de repos au réveil', 'Feeling rested on waking'),
    ],
    primaryMetricId: 'latency',
    durationDays: 14,
    design: 'blocked-random',
    blockSize: 2,
    minEffect: 10,
    expectedDirection: 'B_lower',
    checkInTime: '08:30',
  },
  {
    id: 'fixed-bedtime',
    category: 'sleep',
    title: { fr: 'Coucher à heure fixe', en: 'Fixed bedtime' },
    question: { fr: 'Me coucher à heure fixe me rend-il plus en forme le matin ?', en: 'Does a fixed bedtime make me feel better in the morning?' },
    hypothesis: { fr: 'Avec une heure de coucher fixe, mes matins sont meilleurs.', en: 'With a fixed bedtime, my mornings are better.' },
    conditionA: {
      label: { fr: 'Coucher libre', en: 'Free bedtime' },
      instructions: { fr: 'Couchez-vous quand vous en avez envie.', en: 'Go to bed whenever you feel like it.' },
    },
    conditionB: {
      label: { fr: 'Coucher à heure fixe', en: 'Fixed bedtime' },
      instructions: { fr: 'Au lit à l’heure que vous avez choisie, à 15 minutes près.', en: 'In bed at your chosen time, within 15 minutes.' },
    },
    metrics: [scale('morning', 'Forme au réveil', 'Morning energy'), scale('mood', 'Humeur dans la journée', 'Mood during the day')],
    primaryMetricId: 'morning',
    durationDays: 28,
    design: 'blocked-random',
    blockSize: 4,
    minEffect: 1,
    expectedDirection: 'B_higher',
    checkInTime: '20:30',
  },
  {
    id: 'walk-after-lunch',
    category: 'energy',
    title: { fr: 'Marche après le déjeuner', en: 'Walk after lunch' },
    question: { fr: 'Dix minutes de marche après le déjeuner évitent-elles le coup de barre ?', en: 'Does a ten-minute walk after lunch prevent the afternoon slump?' },
    hypothesis: { fr: 'Après une marche, mon énergie de 15 h est meilleure.', en: 'After a walk, my 3 pm energy is better.' },
    conditionA: {
      label: { fr: 'Pas de marche', en: 'No walk' },
      instructions: { fr: 'Reprenez vos activités directement après le repas.', en: 'Go straight back to your activities after the meal.' },
    },
    conditionB: {
      label: { fr: 'Marche de 10 min', en: '10-minute walk' },
      instructions: { fr: 'Marchez au moins 10 minutes dans la demi-heure qui suit le déjeuner.', en: 'Walk at least 10 minutes within half an hour after lunch.' },
    },
    metrics: [scale('energy', 'Énergie vers 15 h', 'Energy around 3 pm'), scale('focus', 'Concentration l’après-midi', 'Afternoon focus')],
    primaryMetricId: 'energy',
    durationDays: 14,
    design: 'blocked-random',
    blockSize: 2,
    minEffect: 1,
    expectedDirection: 'B_higher',
    checkInTime: '18:00',
  },
  {
    id: 'cold-shower',
    category: 'energy',
    title: { fr: 'Douche froide', en: 'Cold shower' },
    question: { fr: 'Finir ma douche par 30 secondes d’eau froide me donne-t-il de l’énergie ?', en: 'Does ending my shower with 30 seconds of cold water give me energy?' },
    hypothesis: { fr: 'Les jours de douche froide, je me sens plus énergique le matin.', en: 'On cold-shower days I feel more energetic in the morning.' },
    conditionA: {
      label: { fr: 'Douche normale', en: 'Normal shower' },
      instructions: { fr: 'Douche à la température habituelle.', en: 'Shower at your usual temperature.' },
    },
    conditionB: {
      label: { fr: 'Finale froide 30 s', en: '30 s cold finish' },
      instructions: { fr: 'Terminez la douche par 30 secondes d’eau franchement froide.', en: 'End the shower with 30 seconds of properly cold water.' },
    },
    metrics: [scale('energy', 'Énergie en fin de matinée', 'Late-morning energy'), scale('mood', 'Humeur', 'Mood')],
    primaryMetricId: 'energy',
    durationDays: 14,
    design: 'blocked-random',
    blockSize: 2,
    minEffect: 1,
    expectedDirection: 'B_higher',
    checkInTime: '12:30',
  },
  {
    id: 'power-nap',
    category: 'energy',
    title: { fr: 'Sieste de 20 minutes', en: '20-minute nap' },
    question: { fr: 'Une courte sieste améliore-t-elle ma fin d’après-midi sans gâcher ma nuit ?', en: 'Does a short nap improve my late afternoon without ruining my night?' },
    hypothesis: { fr: 'La sieste améliore l’après-midi et ne nuit pas au sommeil nocturne.', en: 'The nap improves the afternoon and does not hurt night sleep.' },
    conditionA: {
      label: { fr: 'Pas de sieste', en: 'No nap' },
      instructions: { fr: 'Pas de sieste de la journée.', en: 'No nap during the day.' },
    },
    conditionB: {
      label: { fr: 'Sieste 20 min', en: '20-minute nap' },
      instructions: { fr: 'Sieste de 20 minutes maximum (minuteur), avant 15 h.', en: 'Nap of at most 20 minutes (set a timer), before 3 pm.' },
    },
    metrics: [scale('energy', 'Énergie en fin d’après-midi', 'Late-afternoon energy'), scale('sleep', 'Qualité du sommeil la nuit suivante', 'Sleep quality the following night')],
    primaryMetricId: 'energy',
    durationDays: 14,
    design: 'blocked-random',
    blockSize: 2,
    minEffect: 1,
    expectedDirection: 'B_higher',
    checkInTime: '21:00',
  },
  {
    id: 'phone-free-morning',
    category: 'focus',
    title: { fr: 'Matin sans téléphone', en: 'Phone-free morning' },
    question: { fr: 'Ne pas toucher mon téléphone la première heure améliore-t-il ma concentration ?', en: 'Does not touching my phone for the first hour improve my focus?' },
    hypothesis: { fr: 'Sans téléphone au réveil, ma matinée est plus concentrée.', en: 'Without a phone on waking, my morning is more focused.' },
    conditionA: {
      label: { fr: 'Téléphone comme d’habitude', en: 'Phone as usual' },
      instructions: { fr: 'Consultez votre téléphone quand vous voulez.', en: 'Check your phone whenever you want.' },
    },
    conditionB: {
      label: { fr: 'Pas de téléphone 1 h', en: 'No phone for 1 h' },
      instructions: { fr: 'Aucune consultation du téléphone pendant la première heure après le réveil (réveil et musique autorisés).', en: 'No phone use during the first hour after waking (alarm and music allowed).' },
    },
    metrics: [scale('focus', 'Concentration dans la matinée', 'Morning focus'), scale('calm', 'Sérénité', 'Calm')],
    primaryMetricId: 'focus',
    durationDays: 14,
    design: 'blocked-random',
    blockSize: 2,
    minEffect: 1,
    expectedDirection: 'B_higher',
    checkInTime: '13:00',
  },
  {
    id: 'pomodoro',
    category: 'focus',
    title: { fr: 'Pomodoro ou travail libre', en: 'Pomodoro or free work' },
    question: { fr: 'Travailler en pomodoros me rend-il plus productif que le travail libre ?', en: 'Does working in pomodoros make me more productive than free-form work?' },
    hypothesis: { fr: 'En pomodoros, j’accomplis plus de tâches.', en: 'In pomodoros, I complete more tasks.' },
    conditionA: {
      label: { fr: 'Travail libre', en: 'Free-form work' },
      instructions: { fr: 'Organisez votre journée comme vous l’entendez.', en: 'Organise your day however you like.' },
    },
    conditionB: {
      label: { fr: 'Pomodoros 25/5', en: 'Pomodoros 25/5' },
      instructions: { fr: 'Travaillez par cycles de 25 minutes de concentration et 5 minutes de pause, au moins 4 cycles.', en: 'Work in cycles of 25 minutes focus and 5 minutes break, at least 4 cycles.' },
    },
    metrics: [
      { id: 'tasks', name: { fr: 'Tâches importantes accomplies', en: 'Important tasks completed' }, kind: 'number', unit: { fr: 'tâches', en: 'tasks' }, higherIsBetter: true },
      scale('satisfaction', 'Satisfaction de la journée', 'Satisfaction with the day'),
    ],
    primaryMetricId: 'tasks',
    durationDays: 10,
    design: 'blocked-random',
    blockSize: 2,
    minEffect: 1,
    expectedDirection: 'B_higher',
    checkInTime: '18:30',
  },
  {
    id: 'music-work',
    category: 'focus',
    title: { fr: 'Musique ou silence au travail', en: 'Music or silence at work' },
    question: { fr: 'La musique m’aide-t-elle vraiment à me concentrer ?', en: 'Does music really help me focus?' },
    hypothesis: { fr: 'Je me concentre mieux en silence.', en: 'I focus better in silence.' },
    conditionA: {
      label: { fr: 'Musique', en: 'Music' },
      instructions: { fr: 'Travaillez en musique (votre playlist habituelle) pendant les périodes de concentration.', en: 'Work with music (your usual playlist) during focus periods.' },
    },
    conditionB: {
      label: { fr: 'Silence', en: 'Silence' },
      instructions: { fr: 'Travaillez sans musique ; bouchons ou casque sans son autorisés.', en: 'Work without music; earplugs or a silent headset are allowed.' },
    },
    metrics: [
      scale('focus', 'Qualité de la concentration', 'Focus quality'),
      { id: 'distractions', name: { fr: 'Nombre de distractions', en: 'Number of distractions' }, kind: 'number', higherIsBetter: false },
    ],
    primaryMetricId: 'focus',
    durationDays: 10,
    design: 'blocked-random',
    blockSize: 2,
    minEffect: 1,
    expectedDirection: 'B_higher',
    checkInTime: '18:30',
  },
  {
    id: 'meditation',
    category: 'mood',
    title: { fr: 'Dix minutes de méditation', en: 'Ten minutes of meditation' },
    question: { fr: 'Dix minutes de méditation le matin réduisent-elles mon stress ?', en: 'Do ten minutes of morning meditation reduce my stress?' },
    hypothesis: { fr: 'Les jours de méditation, mon stress en fin de journée est plus bas.', en: 'On meditation days, my end-of-day stress is lower.' },
    conditionA: {
      label: { fr: 'Pas de méditation', en: 'No meditation' },
      instructions: { fr: 'Commencez votre journée normalement.', en: 'Start your day as usual.' },
    },
    conditionB: {
      label: { fr: 'Méditation 10 min', en: '10-minute meditation' },
      instructions: { fr: '10 minutes de méditation assise (minuteur ou application), avant le premier écran.', en: '10 minutes of seated meditation (timer or app), before the first screen.' },
    },
    metrics: [scale('stress', 'Stress en fin de journée', 'End-of-day stress', false), scale('mood', 'Humeur générale', 'Overall mood')],
    primaryMetricId: 'stress',
    durationDays: 21,
    design: 'blocked-random',
    blockSize: 2,
    minEffect: 1,
    expectedDirection: 'B_lower',
    checkInTime: '21:00',
  },
  {
    id: 'gratitude',
    category: 'mood',
    title: { fr: 'Trois gratitudes le soir', en: 'Three gratitudes at night' },
    question: { fr: 'Noter trois gratitudes le soir améliore-t-il mon humeur du lendemain ?', en: 'Does writing three gratitudes at night improve my mood the next day?' },
    hypothesis: { fr: 'Le lendemain d’une soirée gratitude, mon humeur est meilleure.', en: 'The day after a gratitude evening, my mood is better.' },
    conditionA: {
      label: { fr: 'Soirée normale', en: 'Normal evening' },
      instructions: { fr: 'Rien de particulier le soir.', en: 'Nothing special in the evening.' },
    },
    conditionB: {
      label: { fr: 'Trois gratitudes', en: 'Three gratitudes' },
      instructions: { fr: 'Avant de dormir, écrivez trois choses précises pour lesquelles vous êtes reconnaissant·e.', en: 'Before sleeping, write down three specific things you are grateful for.' },
    },
    metrics: [scale('mood', 'Humeur du lendemain', 'Next-day mood')],
    primaryMetricId: 'mood',
    durationDays: 14,
    design: 'blocked-random',
    blockSize: 2,
    minEffect: 1,
    expectedDirection: 'B_higher',
    checkInTime: '21:30',
  },
  {
    id: 'protein-breakfast',
    category: 'body',
    title: { fr: 'Petit-déjeuner protéiné', en: 'Protein breakfast' },
    question: { fr: 'Un petit-déjeuner riche en protéines réduit-il ma faim de 11 h ?', en: 'Does a protein-rich breakfast reduce my 11 am hunger?' },
    hypothesis: { fr: 'Avec des protéines le matin, j’ai moins faim en fin de matinée.', en: 'With protein in the morning, I am less hungry late morning.' },
    conditionA: {
      label: { fr: 'Petit-déjeuner habituel', en: 'Usual breakfast' },
      instructions: { fr: 'Mangez ce que vous mangez d’habitude.', en: 'Eat what you usually eat.' },
    },
    conditionB: {
      label: { fr: 'Petit-déjeuner protéiné', en: 'Protein breakfast' },
      instructions: { fr: 'Petit-déjeuner avec une vraie source de protéines (œufs, yaourt grec, fromage blanc, tofu…).', en: 'Breakfast with a real protein source (eggs, Greek yoghurt, cottage cheese, tofu…).' },
    },
    metrics: [scale('hunger', 'Faim vers 11 h', 'Hunger around 11 am', false), scale('energy', 'Énergie du matin', 'Morning energy')],
    primaryMetricId: 'hunger',
    durationDays: 14,
    design: 'blocked-random',
    blockSize: 2,
    minEffect: 1.5,
    expectedDirection: 'B_lower',
    checkInTime: '13:00',
  },
  {
    id: 'evening-stretch',
    category: 'body',
    title: { fr: 'Étirements du soir', en: 'Evening stretches' },
    question: { fr: 'Dix minutes d’étirements le soir réduisent-elles mes douleurs de dos ?', en: 'Do ten minutes of evening stretches reduce my back pain?' },
    hypothesis: { fr: 'Le lendemain d’une séance, mon dos est moins douloureux.', en: 'The day after a session, my back hurts less.' },
    conditionA: {
      label: { fr: 'Pas d’étirements', en: 'No stretches' },
      instructions: { fr: 'Soirée normale, sans séance dédiée.', en: 'Normal evening, no dedicated session.' },
    },
    conditionB: {
      label: { fr: 'Étirements 10 min', en: '10-minute stretches' },
      instructions: { fr: '10 minutes d’étirements doux (dos, hanches, ischio-jambiers) avant le coucher.', en: '10 minutes of gentle stretches (back, hips, hamstrings) before bed.' },
    },
    metrics: [scale('pain', 'Douleur de dos le lendemain', 'Back pain the next day', false), scale('sleep', 'Qualité du sommeil', 'Sleep quality')],
    primaryMetricId: 'pain',
    durationDays: 14,
    design: 'blocked-random',
    blockSize: 2,
    minEffect: 1,
    expectedDirection: 'B_lower',
    checkInTime: '20:00',
  },
  {
    id: 'afternoon-sugar',
    category: 'body',
    title: { fr: 'Sucre de l’après-midi', en: 'Afternoon sugar' },
    question: { fr: 'Supprimer le sucré de l’après-midi évite-t-il le coup de barre de 16 h ?', en: 'Does cutting afternoon sweets avoid the 4 pm slump?' },
    hypothesis: { fr: 'Sans sucré l’après-midi, mon énergie de 17 h est plus stable.', en: 'Without afternoon sweets, my 5 pm energy is steadier.' },
    conditionA: {
      label: { fr: 'Comme d’habitude', en: 'As usual' },
      instructions: { fr: 'Goûter, biscuits ou boissons sucrées comme d’habitude.', en: 'Snacks, biscuits or sweet drinks as usual.' },
    },
    conditionB: {
      label: { fr: 'Pas de sucré après 14 h', en: 'No sweets after 2 pm' },
      instructions: { fr: 'Aucun aliment ou boisson sucrée entre 14 h et le dîner (fruits entiers autorisés).', en: 'No sweet food or drink between 2 pm and dinner (whole fruit allowed).' },
    },
    metrics: [scale('energy', 'Énergie vers 17 h', 'Energy around 5 pm'), scale('cravings', 'Envies de grignoter', 'Snack cravings', false)],
    primaryMetricId: 'energy',
    durationDays: 14,
    design: 'blocked-random',
    blockSize: 2,
    minEffect: 1,
    expectedDirection: 'B_higher',
    checkInTime: '19:00',
  },
];

export const TEMPLATE_CATEGORIES: TemplateCategory[] = ['sleep', 'energy', 'focus', 'mood', 'body'];

export function findTemplate(id: string): Template | undefined {
  return TEMPLATES.find((t) => t.id === id);
}
