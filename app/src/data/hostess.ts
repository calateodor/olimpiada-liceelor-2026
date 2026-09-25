/* GENERAT de scripts/hostess.py din folderul cu pozele candidatelor. Nu se editeaza de mana. */
import type { SchoolId } from './schools';

export interface Hostess { id: string; name: string; school: SchoolId; full: string; eyes: string; w: number; h: number; eyesW: number; eyesH: number; focusY: number }

export const HOSTESSES: Hostess[] = [
  {"id": "pruna-andra", "name": "Prună Andra", "school": "titulescu", "full": "/hostess/pruna-andra.jpg", "eyes": "/hostess/pruna-andra-eyes.jpg", "w": 706, "h": 1146, "eyesW": 945, "eyesH": 240, "focusY": 0.464},
  {"id": "balasoiu-alexia-maria", "name": "Bălășoiu Alexia-Maria", "school": "minulescu", "full": "/hostess/balasoiu-alexia-maria.jpg", "eyes": "/hostess/balasoiu-alexia-maria-eyes.jpg", "w": 844, "h": 1500, "eyesW": 2007, "eyesH": 240, "focusY": 0.3},
  {"id": "petroi-anaya-veronica", "name": "Petroi Anaya Veronica", "school": "greceanu", "full": "/hostess/petroi-anaya-veronica.jpg", "eyes": "/hostess/petroi-anaya-veronica-eyes.jpg", "w": 844, "h": 1500, "eyesW": 2033, "eyesH": 240, "focusY": 0.406},
  {"id": "dumitrescu-daria-anamaria", "name": "Dumitrescu Daria Anamaria", "school": "lps", "full": "/hostess/dumitrescu-daria-anamaria.jpg", "eyes": "/hostess/dumitrescu-daria-anamaria-eyes.jpg", "w": 1009, "h": 1500, "eyesW": 1994, "eyesH": 240, "focusY": 0.405},
];
