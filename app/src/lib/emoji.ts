/** Exact un emoji: steag (două regional indicators) sau o pictogramă cu eventual ton de piele,
    selector de variație, keycap sau secvențe ZWJ (👨‍👩‍👧, 🏳️‍🌈). Cifrele și literele nu trec. */
export const EMOJI_RE = /^(?:\p{RI}\p{RI}|\p{Extended_Pictographic}(?:\p{EMod}|\uFE0F|\u20E3)?(?:\u200D\p{Extended_Pictographic}(?:\p{EMod}|\uFE0F)?){0,4})$/u;
export const isEmoji = (s: string) => s.length <= 24 && EMOJI_RE.test(s);
/** cele mai la îndemână, în ordinea din selector */
export const QUICK_EMOJI = ['❤️', '🔥', '👏', '😂', '😮', '💪', '🏆', '🥇', '⚽', '🏀', '🏐', '🤾', '🎉', '😍', '👀', '💯'];
