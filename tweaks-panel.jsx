// Minimal production stub — provides useTweaks hook used by app + settings.
// The dev tweaks panel UI is stripped; theme/accent are managed in Settings.

function useTweaks(defaults) {
  const [state, setState] = React.useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('odemes-prefs') || '{}');
      return { ...defaults, ...saved };
    } catch (e) {
      return defaults;
    }
  });

  const setTweak = React.useCallback((key, value) => {
    setState(prev => {
      const next = { ...prev, [key]: value };
      try { localStorage.setItem('odemes-prefs', JSON.stringify(next)); } catch (e) {}
      return next;
    });
  }, []);

  return [state, setTweak];
}

// No-op components — not rendered in production build
function TweaksPanel({ children }) { return null; }
function TweakSection() { return null; }
function TweakRadio() { return null; }
function TweakColor() { return null; }
function TweakSelect() { return null; }
function TweakToggle() { return null; }
function TweakSlider() { return null; }

window.useTweaks = useTweaks;
window.TweaksPanel = TweaksPanel;
window.TweakSection = TweakSection;
window.TweakRadio = TweakRadio;
window.TweakColor = TweakColor;
window.TweakSelect = TweakSelect;
window.TweakToggle = TweakToggle;
window.TweakSlider = TweakSlider;
