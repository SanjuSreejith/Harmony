import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Volume2,
  HardDrive,
  Sliders,
  Sparkles,
  Radio,
  Trash2,
  Check,
  Headphones,
  Moon,
  Info,
  Download,
  Upload,
  RotateCcw,
  Edit3,
  Save,
  CheckCircle2,
  AlertTriangle,
  Activity,
  FileText,
  Server,
  Wifi,
  RefreshCw,
  Zap,
  Smartphone
} from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';
import {
  getServerUrl,
  setServerUrl,
  PC_USB_SERVER,
  PC_WIFI_SERVER,
  CLOUD_FALLBACK_SERVER,
  resolveServer,
  testServerConnection,
  pingServer,
  setServerSelection,
  getServerSelection,
  SERVER_MODES
} from '../services/api';
import {
  getRLInsights,
  resetRLModel,
  exportRLData,
  importRLData
} from '../services/reinforcementLearning';
import {
  exportTelemetryData,
  clearTelemetryState,
  importTelemetryData,
  detectLanguage
} from '../services/telemetry';

export default function SettingsModal() {
  const {
    currentTrack,
    showSettingsModal,
    setShowSettingsModal,
    audioQuality,
    setAudioQuality,
    equalizerPreset,
    setEqualizerPreset,
    autoplay,
    setAutoplay,
    normalizeVolume,
    setNormalizeVolume,
    ambientGlow,
    setAmbientGlow,
    downloadedTracks,
    offlineSizeMB,
    clearDownloads,
    setShowPreferencesModal,
    getAffinityProfile,
    preferences,
    updatePreferences,
    history,
    playlists,
    requestNotificationPermission,
    requestBatteryOptimization,
    openAppSettings,
    isInstalled,
    triggerInstall
  } = usePlayer();

  const [rlStats, setRlStats] = useState(() => getRLInsights());
  const [affinityStats, setAffinityStats] = useState(() => (getAffinityProfile ? getAffinityProfile() : null));
  const [showJsonEditor, setShowJsonEditor] = useState(false);
  const [editorContent, setEditorContent] = useState('');
  const [editorError, setEditorError] = useState('');
  const [actionSuccessMsg, setActionSuccessMsg] = useState('');
  const [serverMode, setServerMode] = useState(() => getServerSelection().mode);
  const [backendIp, setBackendIp] = useState(() => getServerSelection().url || getServerUrl());
  const [activeServer, setActiveServer] = useState(() => getServerUrl());
  const [isTestingServer, setIsTestingServer] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState({
    tested: false,
    isConnected: false,
    latency: null,
    serverUrl: getServerUrl()
  });

  const fileInputRef = useRef(null);

  useEffect(() => {
    if (showSettingsModal) {
      refreshStats();
      const currentSelection = getServerSelection();
      setServerMode(currentSelection.mode);
      setActiveServer(getServerUrl());
      handleTestServer();
    }
  }, [showSettingsModal, currentTrack?.id]);

  async function handleTestServer(targetUrl = null) {
    const cleanTarget = typeof targetUrl === 'string' ? targetUrl : null;
    setIsTestingServer(true);
    const result = await testServerConnection(cleanTarget);
    setIsTestingServer(false);
    setConnectionStatus({
      tested: true,
      isConnected: result.isConnected,
      latency: result.latency,
      isCloud: result.isCloud,
      isPc: result.isPc,
      label: result.label,
      serverUrl: result.url
    });
    setActiveServer(result.url);
    if (result.isConnected) {
      if (result.isCloud) {
        showNotification(`Connected to 24/7 Cloud Server ☁️ (${result.latency}ms)`);
      } else {
        let label = result.url.replace('http://', '');
        if (result.url.includes('10.210.177.65')) label = 'USB Cable (10.210.177.65)';
        else if (result.url.includes('10.128.89.220')) label = 'Wi-Fi (10.128.89.220)';
        else if (result.url.includes('192.168.')) label = 'Hotspot';
        showNotification(`Connected to PC Server (${label}) ⚡ (${result.latency}ms)`);
      }
    } else {
      showNotification('Server Unreachable ❌ Tap [24/7 Cloud] or check connection');
    }
  }

  if (!showSettingsModal) return null;

  function refreshStats() {
    setRlStats(getRLInsights());
    if (getAffinityProfile) setAffinityStats(getAffinityProfile());
  }

  function showNotification(msg) {
    setActionSuccessMsg(msg);
    setTimeout(() => setActionSuccessMsg(''), 3500);
  }

  // 1. Download / Export All Data (Telemetry, RL Model, Preferences, Playlists)
  function handleDownloadData() {
    try {
      const fullExport = {
        app: 'Harmoniq',
        version: '2.0',
        exportedAt: new Date().toISOString(),
        telemetry: exportTelemetryData ? exportTelemetryData() : {},
        reinforcementLearning: exportRLData ? exportRLData() : {},
        preferences: preferences || {},
        playlists: playlists || [],
        recentHistory: history ? history.slice(0, 50) : [],
        downloadedTrackCount: downloadedTracks ? downloadedTracks.length : 0
      };

      const jsonStr = JSON.stringify(fullExport, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `harmoniq_ai_and_tracking_data_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      showNotification('Downloaded AI & Telemetry backup!');
    } catch (err) {
      console.error('Download error:', err);
      alert('Failed to export data: ' + err.message);
    }
  }

  // 2. Open Raw JSON Editor for Telemetry & AI Model
  function handleOpenEditor() {
    try {
      const currentData = {
        reinforcementLearning: exportRLData ? exportRLData() : {},
        telemetry: exportTelemetryData ? exportTelemetryData() : {},
        preferences: preferences || {}
      };
      setEditorContent(JSON.stringify(currentData, null, 2));
      setEditorError('');
      setShowJsonEditor(true);
    } catch (e) {
      alert('Error opening editor: ' + e.message);
    }
  }

  // 3. Save Edited JSON Data
  function handleSaveEditedData() {
    try {
      setEditorError('');
      const parsed = JSON.parse(editorContent);

      if (parsed.reinforcementLearning) {
        importRLData(parsed.reinforcementLearning);
      }
      if (parsed.telemetry) {
        importTelemetryData(parsed.telemetry);
      }
      if (parsed.preferences && updatePreferences) {
        updatePreferences(parsed.preferences);
      }

      refreshStats();
      setShowJsonEditor(false);
      showNotification('AI & Track settings updated successfully!');
    } catch (err) {
      setEditorError('Invalid JSON format: ' + err.message);
    }
  }

  // 4. Import / Restore Data from File
  function handleFileUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result;
        const parsed = JSON.parse(text);

        if (parsed.reinforcementLearning) {
          importRLData(parsed.reinforcementLearning);
        }
        if (parsed.telemetry) {
          importTelemetryData(parsed.telemetry);
        }
        if (parsed.preferences && updatePreferences) {
          updatePreferences(parsed.preferences);
        }

        refreshStats();
        showNotification('Imported and restored data successfully!');
      } catch (err) {
        alert('Failed to import JSON file: ' + err.message);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  // 5. Reset AI & Telemetry
  function handleResetAI() {
    const confirmed = window.confirm(
      'Are you sure you want to reset AI learning and tracking data? This will reset learned weights and play counts to start fresh.'
    );
    if (!confirmed) return;

    try {
      resetRLModel();
      clearTelemetryState();
      refreshStats();
      showNotification('AI model & tracking history reset to fresh state.');
    } catch (e) {
      console.error('Reset error:', e);
    }
  }

  const qualityOptions = [
    { id: 'max', label: 'Max (160kbps)', desc: 'Highest fidelity audio stream' },
    { id: 'high', label: 'High (130kbps AAC)', desc: 'Balanced studio quality (Recommended)' },
    { id: 'normal', label: 'Standard (128kbps)', desc: 'Standard streaming quality' },
    { id: 'saver', label: 'Data Saver (64kbps)', desc: 'Uses minimal cellular mobile data' }
  ];

  const eqPresets = [
    { id: 'flat', label: 'Flat / Original' },
    { id: 'bass', label: 'Bass Boost 🔊' },
    { id: 'vocal', label: 'Vocal Clarity 🎙️' },
    { id: 'treble', label: 'Treble Boost ⚡' },
    { id: 'electronic', label: 'Club / Electronic 🪩' }
  ];

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={() => setShowSettingsModal(false)}
    >
      <div
        className="w-full max-w-sm max-h-[88vh] bg-slate-900 border border-white/10 rounded-3xl p-5 shadow-2xl flex flex-col safe-bottom"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-emerald-400" />
            <h3 className="text-base font-bold text-white">App Settings</h3>
          </div>
          <button
            onClick={() => setShowSettingsModal(false)}
            className="p-1.5 text-slate-400 hover:text-white rounded-full bg-white/5"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Global Toast Notification */}
        {actionSuccessMsg && (
          <div className="mt-2 p-2.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 flex items-center gap-2 text-xs font-semibold animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>{actionSuccessMsg}</span>
          </div>
        )}

        {/* Scrollable Settings Options */}
        <div className="flex-1 overflow-y-auto py-4 space-y-5 no-scrollbar text-xs">
          {/* 1. Audio Streaming Quality */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Headphones className="w-4 h-4 text-emerald-400" />
              <label className="font-bold text-slate-200 uppercase tracking-wider">
                Audio Stream Quality
              </label>
            </div>
            <div className="space-y-1.5">
              {qualityOptions.map((opt) => {
                const isSelected = audioQuality === opt.id;
                return (
                  <button
                    key={opt.id}
                    onClick={() => setAudioQuality(opt.id)}
                    className={`w-full flex items-center justify-between p-2.5 rounded-xl border text-left transition-all ${
                      isSelected
                        ? 'bg-emerald-500/15 border-emerald-500/40 text-white'
                        : 'bg-white/5 border-white/5 text-slate-300 hover:bg-white/10'
                    }`}
                  >
                    <div>
                      <p className="font-semibold text-white">{opt.label}</p>
                      <p className="text-[10px] text-slate-400">{opt.desc}</p>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-emerald-400 stroke-[3px]" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Equalizer / Sound Enhancement */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Volume2 className="w-4 h-4 text-cyan-400" />
              <label className="font-bold text-slate-200 uppercase tracking-wider">
                Sound Enhancement / Equalizer
              </label>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {eqPresets.map((eq) => {
                const isSelected = equalizerPreset === eq.id;
                return (
                  <button
                    key={eq.id}
                    onClick={() => setEqualizerPreset(eq.id)}
                    className={`p-2 rounded-xl border text-center font-semibold transition-all ${
                      isSelected
                        ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300'
                        : 'bg-white/5 border-white/5 text-slate-300 hover:bg-white/10'
                    }`}
                  >
                    {eq.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. AI Learning, Telemetry & Track Intelligence (NEW) */}
          <div className="p-3.5 rounded-2xl bg-gradient-to-b from-white/10 to-white/5 border border-emerald-500/30 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <span className="font-bold text-white uppercase tracking-wider">
                  AI Learning & Tracking
                </span>
              </div>
              <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/15 px-2 py-0.5 rounded-full border border-emerald-500/30">
                {rlStats.learningPhase || 'Active'}
              </span>
            </div>

            {/* Quick Metrics Grid */}
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="p-2 rounded-xl bg-black/40 border border-white/5">
                <span className="text-slate-400 block text-[10px]">Plays Tracked</span>
                <span className="font-bold text-white font-mono text-sm">
                  {affinityStats?.totalPlays || 0}
                </span>
              </div>
              <div className="p-2 rounded-xl bg-black/40 border border-white/5">
                <span className="text-slate-400 block text-[10px]">Auto-Improves</span>
                <span className="font-bold text-emerald-400 font-mono text-sm">
                  {rlStats.totalInteractions || 0}
                </span>
              </div>
              <div className="p-2 rounded-xl bg-black/40 border border-white/5">
                <span className="text-slate-400 block text-[10px]">AI Satisfaction</span>
                <span className="font-bold text-cyan-300 font-mono text-sm">
                  {rlStats.satisfactionRate || 100}%
                </span>
              </div>
              <div className="p-2 rounded-xl bg-black/40 border border-white/5">
                <span className="text-slate-400 block text-[10px]">Active Language</span>
                <span className="font-bold text-purple-300 truncate block">
                  {currentTrack ? detectLanguage(currentTrack) : (affinityStats?.currentLanguage || (preferences?.languages?.[0]) || 'Malayalam')}
                </span>
              </div>
            </div>

            {/* Algorithm Architecture Pill */}
            <div className="px-2.5 py-1.5 rounded-xl bg-black/40 border border-white/5 flex items-center justify-between">
              <span className="text-slate-400 text-[10px]">Engine:</span>
              <span className="text-[10px] font-mono text-emerald-400 font-semibold truncate max-w-[220px]">
                {rlStats.algorithm || 'Hybrid Bandit + Cosine Embeddings'}
              </span>
            </div>

            {/* Top Learned Attributes */}
            <div className="space-y-1.5 pt-1 text-[11px] border-t border-white/10">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Top Genres:</span>
                <span className="text-slate-200 font-medium truncate max-w-[170px] text-right">
                  {affinityStats?.topGenres?.slice(0, 2).map((g) => g.name).join(', ') || (preferences?.genres?.slice(0, 2).join(', ')) || 'Melody, Romantic'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Top Artists:</span>
                <span className="text-slate-200 font-medium truncate max-w-[170px] text-right">
                  {affinityStats?.topArtists?.slice(0, 2).map((a) => a.name).join(', ') || (preferences?.artists?.slice(0, 2).join(', ')) || 'Varied Artists'}
                </span>
              </div>
            </div>

            {/* Action Buttons: Download, Edit, Import, Reset */}
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/10">
              {/* Download JSON Data */}
              <button
                onClick={handleDownloadData}
                className="p-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 font-semibold flex items-center justify-center gap-1.5 transition-colors"
                title="Download all AI weights & telemetry as JSON backup"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download Data</span>
              </button>

              {/* View / Edit JSON */}
              <button
                onClick={handleOpenEditor}
                className="p-2 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 text-cyan-300 font-semibold flex items-center justify-center gap-1.5 transition-colors"
                title="View & Edit AI weights and tracking data directly"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Edit Details</span>
              </button>

              {/* Import JSON Data */}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="p-2 rounded-xl bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/30 text-purple-300 font-semibold flex items-center justify-center gap-1.5 transition-colors"
                title="Import & restore AI data from a JSON file"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Import JSON</span>
              </button>

              {/* Reset AI Learning */}
              <button
                onClick={handleResetAI}
                className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 font-semibold flex items-center justify-center gap-1.5 transition-colors"
                title="Reset AI weights and play counts"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset AI</span>
              </button>

              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>
          </div>

          {/* 4. Offline Storage Manager */}
          <div className="p-3 rounded-2xl bg-white/5 border border-white/10 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <HardDrive className="w-4 h-4 text-indigo-400" />
                <span className="font-bold text-white uppercase tracking-wider">
                  Offline Music Storage
                </span>
              </div>
              <span className="font-mono text-indigo-300 font-semibold">
                {offlineSizeMB} MB
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              {downloadedTracks.length} tracks downloaded to device for 100% offline play.
            </p>
            {downloadedTracks.length > 0 && (
              <button
                onClick={clearDownloads}
                className="w-full py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 font-semibold flex items-center justify-center gap-1.5 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Clear All Offline Songs
              </button>
            )}
          </div>

          {/* Background Audio & Battery Optimization (Minimized & Lock Screen Playback) */}
          <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-950/40 via-teal-950/30 to-slate-900 border border-emerald-500/20 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Headphones className="w-4 h-4 text-emerald-400" />
                <span className="font-bold text-white text-xs uppercase tracking-wider">
                  Background Audio & Lock Screen
                </span>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold border border-emerald-500/30 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Active
              </span>
            </div>

            <p className="text-[11px] text-slate-300 leading-relaxed">
              Music continues playing continuously when the app is minimized, when using other apps, or when your phone screen is locked.
            </p>

            <div className="grid grid-cols-2 gap-2 pt-0.5">
              <button
                type="button"
                onClick={() => {
                  if (requestNotificationPermission) requestNotificationPermission();
                  showNotification('Notification permission requested');
                }}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] font-semibold text-slate-200 flex items-center justify-center gap-1.5 transition-colors"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Media Notification</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (requestBatteryOptimization) requestBatteryOptimization();
                  showNotification('Opened Battery Optimization settings');
                }}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] font-semibold text-slate-200 flex items-center justify-center gap-1.5 transition-colors"
                title="Disable battery restriction so Android never kills background music"
              >
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>Battery Exemption</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (openAppSettings) openAppSettings();
                  showNotification('Opened App Info (Enable Autostart & No Restrictions)');
                }}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] font-semibold text-slate-200 flex items-center justify-center gap-1.5 transition-colors col-span-2"
                title="Open App Info to enable Autostart and set Battery Saver to No Restrictions (Xiaomi / POCO / Vivo)"
              >
                <Smartphone className="w-3.5 h-3.5 text-cyan-400" />
                <span>POCO / Xiaomi Settings (Autostart & Background)</span>
              </button>
            </div>
          </div>

          {/* 5. Playback Behaviors */}
          <div className="space-y-2">
            <label className="font-bold text-slate-300 uppercase tracking-wider block">
              Playback & Behavior
            </label>

            {/* Autoplay / Infinite Radio */}
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/5 border border-white/5">
              <div>
                <p className="font-semibold text-white">Infinite Radio (Autoplay)</p>
                <p className="text-[10px] text-slate-400">Automatically play related music when queue ends</p>
              </div>
              <button
                onClick={() => setAutoplay(!autoplay)}
                className={`w-11 h-6 rounded-full transition-colors relative flex items-center px-0.5 ${
                  autoplay ? 'bg-emerald-500' : 'bg-slate-700'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white transition-transform ${
                    autoplay ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Volume Normalization */}
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/5 border border-white/5">
              <div>
                <p className="font-semibold text-white">Normalize Volume</p>
                <p className="text-[10px] text-slate-400">Prevents sudden loud or quiet tracks</p>
              </div>
              <button
                onClick={() => setNormalizeVolume(!normalizeVolume)}
                className={`w-11 h-6 rounded-full transition-colors relative flex items-center px-0.5 ${
                  normalizeVolume ? 'bg-emerald-500' : 'bg-slate-700'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white transition-transform ${
                    normalizeVolume ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Ambient Lighting */}
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/5 border border-white/5">
              <div>
                <p className="font-semibold text-white">Dynamic Ambient Glow</p>
                <p className="text-[10px] text-slate-400">Blurs album colors in background</p>
              </div>
              <button
                onClick={() => setAmbientGlow(!ambientGlow)}
                className={`w-11 h-6 rounded-full transition-colors relative flex items-center px-0.5 ${
                  ambientGlow ? 'bg-emerald-500' : 'bg-slate-700'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white transition-transform ${
                    ambientGlow ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* 6. Music Taste / Preferences Shortcut */}
          <button
            onClick={() => {
              setShowSettingsModal(false);
              setShowPreferencesModal(true);
            }}
            className="w-full p-3 rounded-2xl bg-gradient-to-r from-emerald-950/40 via-purple-950/30 to-indigo-950/40 border border-purple-500/20 text-left flex items-center justify-between"
          >
            <div>
              <p className="font-bold text-white flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                Customize Recommendation Profile
              </p>
              <p className="text-[10px] text-slate-400">
                Favorite genres, artists, and current mood
              </p>
            </div>
            <span className="text-[10px] font-semibold text-purple-300">Edit →</span>
          </button>

          {/* 7. Install as Progressive Web App (PWA) Card */}
          <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-slate-900 to-slate-900 border border-emerald-500/20 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <Download className="w-3.5 h-3.5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-white">Standalone Web App (PWA)</p>
                  <p className="text-[10px] text-slate-400">Add to home screen on phone or desktop</p>
                </div>
              </div>
              <button
                type="button"
                onClick={triggerInstall}
                className={`px-3 py-1 rounded-xl text-xs font-bold active:scale-95 transition-all ${
                  isInstalled
                    ? 'bg-white/10 text-emerald-400 border border-emerald-500/30'
                    : 'bg-emerald-400 text-black shadow-md hover:bg-emerald-300'
                }`}
              >
                {isInstalled ? 'Installed ✓' : 'Install'}
              </button>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Open anytime from your home screen or desktop without browser bars. Supports lockscreen audio controls and background playback.
            </p>
          </div>

          {/* App Info */}
          <div className="pt-2 text-center text-slate-500 space-y-1">
            <p className="font-semibold text-slate-400">Harmoniq</p>
            <p className="text-[10px] text-slate-600">v2.0</p>
          </div>

          {/* Backend Server Configuration (Auto Hybrid & Dedicated Server Modes) */}
          <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
                <Server className="w-3.5 h-3.5 text-cyan-400" />
                <span>Audio Streaming Server</span>
              </div>
              <button
                type="button"
                onClick={() => handleTestServer()}
                disabled={isTestingServer}
                className="px-2.5 py-1 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 text-[11px] font-semibold text-cyan-300 flex items-center gap-1 active:scale-95 transition-all"
              >
                <RefreshCw className={`w-3 h-3 ${isTestingServer ? 'animate-spin' : ''}`} />
                <span>Test Server</span>
              </button>
            </div>

            {/* Real Server Connection Status Card */}
            <div className="p-3 rounded-xl bg-black/50 border border-white/10 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-[11px] font-medium">Status:</span>
                {connectionStatus.tested ? (
                  connectionStatus.isConnected ? (
                    connectionStatus.isCloud ? (
                      <span className="font-semibold text-cyan-300 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                        Connected to 24/7 Cloud ({connectionStatus.latency}ms)
                      </span>
                    ) : (
                      <span className="font-semibold text-emerald-300 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        Connected to PC ({connectionStatus.latency}ms)
                      </span>
                    )
                  ) : (
                    <span className="font-semibold text-rose-400 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-rose-500" />
                      Offline / Disconnected
                    </span>
                  )
                ) : (
                  <span className="text-slate-400 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                    Testing connection...
                  </span>
                )}
              </div>

              <div className="text-[11px] text-slate-300 font-mono bg-white/5 px-2.5 py-1.5 rounded-lg flex items-center justify-between border border-white/5">
                <span className="truncate flex-1">{connectionStatus.serverUrl || getServerUrl()}</span>
                <span className="ml-2 text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-cyan-300 font-sans font-semibold uppercase tracking-wider">
                  {serverMode}
                </span>
              </div>

              {!connectionStatus.isConnected && connectionStatus.tested && (
                <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-[11px] text-rose-200 leading-relaxed">
                  PC server unreachable. Tap <strong className="text-cyan-300 font-bold">[24/7 Cloud]</strong> below to stream via cellular data/internet, or connect phone to PC via USB Cable / Wi-Fi.
                </div>
              )}
            </div>

            {/* Quick-switch dedicated server modes */}
            <div>
              <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold mb-1.5">
                Select Server Mode:
              </div>
              <div className="grid grid-cols-4 gap-1.5 text-xs">
                {/* 1. USB Cable */}
                <button
                  type="button"
                  onClick={() => {
                    setServerSelection(SERVER_MODES.USB);
                    setServerMode(SERVER_MODES.USB);
                    setBackendIp(PC_USB_SERVER);
                    handleTestServer(PC_USB_SERVER);
                    showNotification('Pinned to PC USB Cable (10.210.177.65) ⚡');
                  }}
                  className={`p-2 rounded-xl border text-[10px] font-semibold flex flex-col items-center justify-center gap-1 transition-all ${
                    serverMode === SERVER_MODES.USB
                      ? 'bg-emerald-500/25 text-emerald-200 border-emerald-400 shadow-md shadow-emerald-500/10'
                      : 'bg-white/5 text-slate-400 border-white/10 hover:text-white'
                  }`}
                  title="Use high-speed USB Cable connection to PC"
                >
                  <Zap className="w-3.5 h-3.5 text-emerald-400" />
                  <span>USB Cable</span>
                </button>

                {/* 2. Wi-Fi */}
                <button
                  type="button"
                  onClick={() => {
                    setServerSelection(SERVER_MODES.WIFI);
                    setServerMode(SERVER_MODES.WIFI);
                    setBackendIp(PC_WIFI_SERVER);
                    handleTestServer(PC_WIFI_SERVER);
                    showNotification('Pinned to PC Wi-Fi (10.128.89.220) 📶');
                  }}
                  className={`p-2 rounded-xl border text-[10px] font-semibold flex flex-col items-center justify-center gap-1 transition-all ${
                    serverMode === SERVER_MODES.WIFI
                      ? 'bg-emerald-500/25 text-emerald-200 border-emerald-400 shadow-md shadow-emerald-500/10'
                      : 'bg-white/5 text-slate-400 border-white/10 hover:text-white'
                  }`}
                  title="Use local home Wi-Fi to stream from PC"
                >
                  <Wifi className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Wi-Fi</span>
                </button>

                {/* 3. 24/7 Cloud */}
                <button
                  type="button"
                  onClick={() => {
                    setServerSelection(SERVER_MODES.CLOUD);
                    setServerMode(SERVER_MODES.CLOUD);
                    setBackendIp(CLOUD_FALLBACK_SERVER);
                    handleTestServer(CLOUD_FALLBACK_SERVER);
                    showNotification('Pinned to 24/7 Cloud Server ☁️ (Plays anywhere)');
                  }}
                  className={`p-2 rounded-xl border text-[10px] font-semibold flex flex-col items-center justify-center gap-1 transition-all ${
                    serverMode === SERVER_MODES.CLOUD
                      ? 'bg-cyan-500/25 text-cyan-200 border-cyan-400 shadow-md shadow-cyan-500/10'
                      : 'bg-white/5 text-slate-400 border-white/10 hover:text-white'
                  }`}
                  title="Use 24/7 Render Cloud Server (works on mobile data and outdoors)"
                >
                  <Server className="w-3.5 h-3.5 text-cyan-400" />
                  <span>24/7 Cloud</span>
                </button>

                {/* 4. Auto-Switch */}
                <button
                  type="button"
                  onClick={() => {
                    setServerSelection(SERVER_MODES.AUTO);
                    setServerMode(SERVER_MODES.AUTO);
                    setBackendIp('');
                    handleTestServer();
                    showNotification('Auto-Switch: PC at home ⚡, Cloud outdoors ☁️');
                  }}
                  className={`p-2 rounded-xl border text-[10px] font-semibold flex flex-col items-center justify-center gap-1 transition-all ${
                    serverMode === SERVER_MODES.AUTO
                      ? 'bg-purple-500/25 text-purple-200 border-purple-400 shadow-md shadow-purple-500/10'
                      : 'bg-white/5 text-slate-400 border-white/10 hover:text-white'
                  }`}
                  title="Automatically probe PC first, then failover to Cloud"
                >
                  <RefreshCw className={`w-3.5 h-3.5 text-purple-400 ${isTestingServer ? 'animate-spin' : ''}`} />
                  <span>Auto</span>
                </button>
              </div>
            </div>

            {/* Custom URL Input */}
            <div className="flex gap-2 pt-0.5">
              <input
                type="text"
                value={backendIp}
                onChange={(e) => setBackendIp(e.target.value)}
                placeholder="Custom server URL (e.g. http://10.x.x.x:3000)"
                className="flex-1 px-3 py-1.5 rounded-xl bg-slate-800 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
              <button
                type="button"
                onClick={() => {
                  if (backendIp && backendIp.trim()) {
                    setServerSelection(SERVER_MODES.CUSTOM, backendIp);
                    setServerMode(SERVER_MODES.CUSTOM);
                    handleTestServer(backendIp);
                    showNotification('Custom server URL saved!');
                  }
                }}
                className="px-3.5 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-xs font-semibold text-white transition-colors"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Raw JSON Data Editor Modal */}
      {showJsonEditor && (
        <div
          className="fixed inset-0 z-60 bg-black/90 backdrop-blur-lg flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setShowJsonEditor(false)}
        >
          <div
            className="w-full max-w-md bg-slate-900 border border-white/15 rounded-3xl p-5 shadow-2xl flex flex-col max-h-[85vh] space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-cyan-400" />
                <h4 className="text-sm font-bold text-white">Edit AI & Telemetry JSON</h4>
              </div>
              <button
                onClick={() => setShowJsonEditor(false)}
                className="p-1 rounded-full text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-[11px] text-slate-400">
              Inspect or edit Reinforcement Learning Q-values, genre/artist weights, and tracking telemetry:
            </p>

            {editorError && (
              <div className="p-2 rounded-xl bg-red-500/20 border border-red-500/40 text-red-300 text-[11px] font-mono">
                {editorError}
              </div>
            )}

            <textarea
              value={editorContent}
              onChange={(e) => setEditorContent(e.target.value)}
              className="flex-1 w-full min-h-[300px] p-3 rounded-2xl bg-black/70 border border-white/10 text-emerald-400 font-mono text-[11px] focus:outline-none focus:border-cyan-400 no-scrollbar resize-none"
              spellCheck={false}
            />

            <div className="flex items-center justify-end gap-2 pt-1 border-t border-white/10">
              <button
                type="button"
                onClick={() => setShowJsonEditor(false)}
                className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveEditedData}
                className="px-4 py-1.5 rounded-xl text-xs font-bold bg-cyan-500 text-black hover:bg-cyan-400 flex items-center gap-1.5 shadow-lg active:scale-95 transition-all"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save Changes</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}