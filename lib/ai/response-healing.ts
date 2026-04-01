import { callOpenRouter } from './openrouter';

/**
 * Attempts to heal a truncated AI response by asking the model to continue.
 * Returns the full (healed) text.
 */
export async function healResponse(
  partialText: string,
  expectedMarker: string,
  model: string,
  maxRetries = 2
): Promise<string> {
  let currentText = partialText;
  let attempts = 0;

  while (attempts < maxRetries && !currentText.includes(expectedMarker)) {
    attempts++;
    console.log(`[response-healing] Attempt ${attempts}/${maxRetries} — marker "${expectedMarker}" not found`);

    const tailText = currentText.slice(-3000); // send last 3k chars for context

    try {
      const continuation = await callOpenRouter({
        model,
        maxTokens: 32000,
        messages: [
          {
            role: 'user',
            content: `Il testo seguente è il risultato parziale di una generazione interrotta.
Continua ESATTAMENTE da dove si è interrotta, mantenendo struttura, stile e coerenza.
Non ricominciare dall'inizio. Non ripetere il testo già scritto.

TESTO PRODOTTO FINORA (ultimi 3000 caratteri):
${tailText}
[...fine testo parziale...]

Continua la generazione e assicurati di raggiungere il marker: ${expectedMarker}`,
          },
        ],
      });

      currentText += '\n' + continuation;
    } catch (err) {
      console.error('[response-healing] Error during healing attempt:', err);
      break;
    }
  }

  if (!currentText.includes(expectedMarker)) {
    console.warn(`[response-healing] Could not find marker "${expectedMarker}" after ${attempts} attempts`);
  }

  return currentText;
}
