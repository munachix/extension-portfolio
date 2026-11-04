import { mountPanel } from '../panel';
void mountPanel(document.getElementById('app')!);
document.getElementById('options')!.addEventListener('click', (e) => { e.preventDefault(); chrome.runtime.openOptionsPage(); });
