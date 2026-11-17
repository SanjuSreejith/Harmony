import React, { useState } from 'react';
import { X, Sliders, Sparkles, Check, Plus, Trash2, Globe, Heart } from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';
import { ALL_INDIAN_LANGUAGES, MUSIC_TYPES_AND_GENRES } from '../constants/languages';

const POPULAR_ARTISTS = [
  'Arijit Singh',
  'Anirudh Ravichander',
  'Sid Sriram',
  'Karan Aujla',
  'Diljit Dosanjh',
  'Shreya Ghoshal',
  'AR Rahman',
  'AP Dhillon',
  'Pritam',
  'The Weeknd',
  'Taylor Swift',
  'Coldplay',
  'Badshah',
  'Jubin Nautiyal',
  'Sidhu Moosewala'
];

export default function PreferencesModal() {
  const {
    showPreferencesModal,
    setShowPreferencesModal,
    preferences,
    updatePreferences,
    showToast
  } = usePlayer();

  const [selectedGenres, setSelectedGenres] = useState(preferences.genres || ['Romantic Love Songs', 'Lo-Fi & Slowed Reverb']);
  const [selectedMood, setSelectedMood] = useState(preferences.mood || 'Chill');
  const [selectedLanguages, setSelectedLanguages] = useState(preferences.languages || ['Hindi', 'Punjabi']);
  const [artists, setArtists] = useState(preferences.artists || []);
  const [customArtist, setCustomArtist] = useState('');

  if (!showPreferencesModal) return null;

  function toggleGenre(genre) {
    if (selectedGenres.includes(genre)) {
      setSelectedGenres(selectedGenres.filter(g => g !== genre));
    } else {
      setSelectedGenres([...selectedGenres, genre]);
    }
  }

  function toggleLanguage(langId) {
    if (selectedLanguages.includes(langId)) {
      if (selectedLanguages.length > 1) {
        setSelectedLanguages(selectedLanguages.filter(l => l !== langId));
      }
    } else {
      setSelectedLanguages([...selectedLanguages, langId]);
    }
  }

  function addArtist(name) {
    if (!name || !name.trim()) return;
    const clean = name.trim();
    if (!artists.includes(clean)) {
      setArtists([...artists, clean]);
    }
    setCustomArtist('');
  }

  function removeArtist(name) {
    setArtists(artists.filter(a => a !== name));
  }

  function handleSave() {
    updatePreferences({
      genres: selectedGenres.length > 0 ? selectedGenres : ['Romantic Love Songs'],
      mood: selectedMood,
      languages: selectedLanguages.length > 0 ? selectedLanguages : ['Hindi'],
      artists
    });
    setShowPreferencesModal(false);
    showToast('Preferences updated! Recommendations refreshed ✨', 'success');
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={() => setShowPreferencesModal(false)}
    >
      <div
        className="w-full max-w-sm max-h-[90vh] bg-slate-900 border border-white/10 rounded-3xl p-5 shadow-2xl flex flex-col safe-bottom"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-emerald-400" />
            <h3 className="text-base font-bold text-white">Music Taste & Languages</h3>
          </div>
          <button
            onClick={() => setShowPreferencesModal(false)}
            className="p-1.5 text-slate-400 hover:text-white rounded-full bg-white/5"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable preference sections */}
        <div className="flex-1 overflow-y-auto py-4 space-y-5 no-scrollbar text-xs">
          {/* 1. Indian & Regional Languages */}
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <Globe className="w-4 h-4 text-cyan-400" />
              <label className="font-bold text-slate-200 uppercase tracking-wider">
                Languages (All Indian & Global)
              </label>
            </div>
            <p className="text-[11px] text-slate-400 mb-2">
              Select all languages you want to hear in your daily feed:
            </p>
            <div className="grid grid-cols-2 gap-1.5">
              {ALL_INDIAN_LANGUAGES.map((lang) => {
                const isSelected = selectedLanguages.includes(lang.id);
                return (
                  <button
                    key={lang.id}
                    onClick={() => toggleLanguage(lang.id)}
                    className={`p-2 rounded-xl border text-left flex items-center justify-between transition-all ${
                      isSelected
                        ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-200'
                        : 'bg-white/5 border-white/5 text-slate-300 hover:bg-white/10'
                    }`}
                  >
                    <div>
                      <p className="font-bold text-white">{lang.name}</p>
                      <p className="text-[10px] text-slate-400 font-medium">{lang.native}</p>
                    </div>
                    {isSelected && <Check className="w-3.5 h-3.5 text-cyan-400 stroke-[3px]" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Music Types & Vibe Categories */}
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <label className="font-bold text-slate-200 uppercase tracking-wider">
                Music Types & Genres
              </label>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {MUSIC_TYPES_AND_GENRES.map((g) => {
                const isSelected = selectedGenres.includes(g.label);
                return (
                  <button
                    key={g.id}
                    onClick={() => toggleGenre(g.label)}
                    className={`px-3 py-1.5 rounded-full font-semibold transition-all flex items-center gap-1 ${
                      isSelected
                        ? 'bg-emerald-500 text-black shadow-md'
                        : 'bg-white/5 text-slate-300 hover:bg-white/10'
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3 stroke-[3px]" />}
                    {g.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. Favorite Artists */}
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <Heart className="w-4 h-4 text-pink-400" />
              <label className="font-bold text-slate-200 uppercase tracking-wider">
                Favorite Artists
              </label>
            </div>

            {/* Custom artist input */}
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={customArtist}
                onChange={(e) => setCustomArtist(e.target.value)}
                placeholder="Type artist name (e.g. Arijit Singh)..."
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addArtist(customArtist);
                  }
                }}
                className="flex-1 px-3 py-2 rounded-xl bg-white/10 text-white border border-white/10 focus:outline-none focus:border-emerald-400"
              />
              <button
                type="button"
                onClick={() => addArtist(customArtist)}
                className="px-3 py-2 rounded-xl bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 font-bold flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                Add
              </button>
            </div>

            {/* Selected artists pills */}
            {artists.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2.5">
                {artists.map((a) => (
                  <span
                    key={a}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-indigo-200 font-medium"
                  >
                    {a}
                    <button
                      onClick={() => removeArtist(a)}
                      className="hover:text-red-400 ml-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Suggestions */}
            <div className="flex flex-wrap gap-1.5">
              {POPULAR_ARTISTS.filter(a => !artists.includes(a)).slice(0, 8).map((a) => (
                <button
                  key={a}
                  onClick={() => addArtist(a)}
                  className="px-2.5 py-1 rounded-full bg-white/5 hover:bg-white/10 text-[11px] text-slate-400"
                >
                  + {a}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer Save Button */}
        <div className="pt-3 border-t border-white/10 flex gap-2">
          <button
            onClick={() => setShowPreferencesModal(false)}
            className="flex-1 py-2.5 rounded-xl font-semibold text-slate-400 hover:text-white"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex-1 py-2.5 rounded-xl font-bold bg-emerald-500 text-black hover:bg-emerald-400 shadow-lg active:scale-95 transition-all flex items-center justify-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Save & Update
          </button>
        </div>
      </div>
    </div>
  );
}
