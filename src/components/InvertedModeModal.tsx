import React, { useState, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Search, HelpCircle, Check, AlertCircle, Trash2, Award, Clipboard } from "lucide-react";
import { TEAMS, SPECIALS } from "../constants";
import { hapticFeedback } from "../App";
import { ImpactStyle } from "@capacitor/haptics";

// Define a safe local haptic feedback helper
const localHaptic = (style = "LIGHT") => {
  try {
    const capStyle = style === "HEAVY" ? ImpactStyle.Heavy : style === "MEDIUM" ? ImpactStyle.Medium : ImpactStyle.Light;
    hapticFeedback(capStyle);
  } catch (e) {}
};

interface InvertedModeModalProps {
  isOpen: boolean;
  onClose: () => void;
  albums: any[];
  activeAlbum: any;
  setActiveAlbum: (album: any) => void;
  albumService: any;
  isEs: boolean;
  onSuccess: (albumName: string) => void;
}

export const InvertedModeModal: React.FC<InvertedModeModalProps> = ({
  isOpen,
  onClose,
  albums,
  activeAlbum,
  setActiveAlbum,
  albumService,
  isEs,
  onSuccess
}) => {
  const [selectedAlbumId, setSelectedAlbumId] = useState<string>(activeAlbum?.id || albums[0]?.id || "");
  const [rawInput, setRawInput] = useState("");
  const [missingCodes, setMissingCodes] = useState<string[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [warningMsg, setWarningMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Find the currently selected album object
  const currentAlbum = useMemo(() => {
    return albums.find(a => a.id === selectedAlbumId);
  }, [albums, selectedAlbumId]);

  // Generate valid status list
  const validCodesSetAndList = useMemo(() => {
    const cocaColaCount = currentAlbum?.cocaColaCount !== undefined ? currentAlbum.cocaColaCount : 14;
    const albumCC = Array.from({ length: cocaColaCount }, (_, i) => `CC${i + 1}`);
    const list = [
      ...SPECIALS,
      ...TEAMS.flatMap(t => Array.from({ length: 20 }, (_, i) => `${t}${i + 1}`)),
      ...albumCC
    ];
    return {
      list,
      set: new Set(list.map(c => c.toUpperCase()))
    };
  }, [currentAlbum]);

  // Input Suggestions / Autocomplete
  const suggestions = useMemo(() => {
    const trimmer = rawInput.trim().toUpperCase();
    if (trimmer.length < 1) return [];
    
    // Filter suggestions that partially match and aren't already added
    const alreadyAddedMap = new Set(missingCodes.map(c => c.toUpperCase()));
    return validCodesSetAndList.list
      .filter(code => code.toUpperCase().includes(trimmer) && !alreadyAddedMap.has(code.toUpperCase()))
      .slice(0, 10);
  }, [rawInput, missingCodes, validCodesSetAndList]);

  // Parser helper
  const handleAddCodes = (text: string) => {
    if (!text.trim()) return;

    // Split by comma, semicolon, space, newline, or tab
    const parts = text.split(/[\s,;\n\t]+/).map(p => p.trim().toUpperCase()).filter(Boolean);
    if (parts.length === 0) return;

    const currentUpper = new Set(missingCodes.map(c => c.toUpperCase()));
    const validSet = validCodesSetAndList.set;

    const added: string[] = [];
    const invalid: string[] = [];
    const duplicates: string[] = [];
    let limitReached = false;

    for (const part of parts) {
      if (validSet.has(part)) {
        if (currentUpper.has(part) || added.includes(part)) {
          duplicates.push(part);
        } else {
          if (missingCodes.length + added.length >= 30) {
            limitReached = true;
            break;
          }
          added.push(part);
        }
      } else {
        invalid.push(part);
      }
    }

    if (added.length > 0) {
      setMissingCodes(prev => [...prev, ...added]);
      localHaptic("LIGHT");
    }

    // Compose messages to inform the user
    if (limitReached) {
      setWarningMsg(isEs 
        ? "Se alcanzó el límite máximo de 30 barajitas faltantes. Otras fueron omitidas." 
        : "Reached the maximum limit of 30 missing stickers. Others were omitted.");
    } else if (invalid.length > 0) {
      setWarningMsg(isEs 
        ? `Código(s) inválido(s) omitido(s): ${invalid.join(", ")}` 
        : `Invalid code(s) ignored: ${invalid.join(", ")}`);
    } else {
      setWarningMsg(null);
    }
    
    setErrorMsg(null);
    setRawInput("");
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === "," || e.key === " ") {
      e.preventDefault();
      handleAddCodes(rawInput);
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData("text");
    handleAddCodes(pastedText);
  };

  const handleDeleteCode = (codeToDelete: string) => {
    setMissingCodes(prev => prev.filter(c => c !== codeToDelete));
    localHaptic("LIGHT");
  };

  const handleSave = async () => {
    if (!selectedAlbumId) {
      setErrorMsg(isEs ? "Por favor selecciona un álbum" : "Please select an album");
      return;
    }

    if (missingCodes.length > 30) {
      setErrorMsg(isEs 
        ? "Puedes seleccionar un máximo de 30 barajitas faltantes." 
        : "You can specify a maximum of 30 missing stickers.");
      return;
    }

    setSaving(true);
    setErrorMsg(null);
    setWarningMsg(null);
    localHaptic("MEDIUM");

    try {
      // Execute database update
      await albumService.saveInvertedInventory(
        selectedAlbumId,
        missingCodes,
        validCodesSetAndList.list
      );

      // Automatically switch to the configured album
      if (currentAlbum) {
        setActiveAlbum(currentAlbum);
      }

      localHaptic("HEAVY");
      onSuccess(currentAlbum?.name || "Album");
      onClose();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(isEs 
        ? "Ocurrió un error al guardar el álbum. Inténtalo de nuevo." 
        : "Error saving album. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[140] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-dark-card w-full max-w-lg rounded-3xl border border-white/10 shadow-[0_0_50px_rgba(212,175,55,0.15)] flex flex-col max-h-[90vh] overflow-hidden"
        >
          {/* Header */}
          <div className="p-6 border-b border-white/5 flex items-center justify-between bg-fifa-gold/5 shrink-0">
            <div className="flex items-center gap-2">
              <Award className="text-fifa-gold animate-pulse" size={24} />
              <div>
                <h3 className="text-lg font-display font-black text-white leading-none">
                  {isEs ? "Modo Inverso" : "Inverted Mode"}
                </h3>
                <p className="text-[10px] uppercase font-mono tracking-wider text-fifa-gold mt-1">
                  {isEs ? "Rellenado Inteligente" : "Smart Auto-Fill"}
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                localHaptic("LIGHT");
                onClose();
              }}
              className="p-2 hover:bg-white/5 rounded-full transition-colors text-gray-500 hover:text-white"
            >
              <X size={18} />
            </button>
          </div>

          <div className="p-6 flex-1 overflow-y-auto custom-scrollbar space-y-6">
            {/* Instruction Banner */}
            <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 flex gap-3 text-xs leading-relaxed text-gray-400">
              <HelpCircle className="text-fifa-gold shrink-0 mt-0.5" size={16} />
              <p>
                {isEs 
                  ? "Este modo marca automáticamente todas las barajitas del álbum como obtenidas, EXCEPTO un máximo de 30 que especifiques como faltantes. Es ideal para coleccionistas que están por rellenar y prefieren apuntar solo lo que les hace falta."
                  : "This mode instantly marks all stickers in your album as collected, EXCEPT for up to 30 specified missing stickers. Ideal for collectors close to finishing who want to record only what is left."}
              </p>
            </div>

            {/* Select Album */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">
                {isEs ? "1. Selecciona el Álbum" : "1. Select Album"}
              </label>
              <select
                value={selectedAlbumId}
                onChange={(e) => {
                  setSelectedAlbumId(e.target.value);
                  setMissingCodes([]);
                  setErrorMsg(null);
                  setWarningMsg(null);
                }}
                className="w-full bg-[#141419] border border-white/10 rounded-xl px-4 py-3.5 text-xs font-semibold text-white focus:outline-none focus:border-fifa-gold transition-colors"
              >
                {albums.map((al) => (
                  <option key={al.id} value={al.id}>
                    {al.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Sticker Input Block */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center justify-between">
                <span>{isEs ? "2. Inserta Barajitas Faltantes" : "2. Insert Missing Stickers"}</span>
                <span className="text-fifa-gold font-mono text-[9px] font-black uppercase">
                  {missingCodes.length} / 30 {isEs ? "FALTANTES" : "MISSING"}
                </span>
              </label>

              {/* Text Tag input container */}
              <div className="bg-[#141419] border border-white/10 rounded-xl px-4 py-3 focus-within:border-fifa-gold transition-all">
                <div className="flex items-center gap-2 mb-2">
                  <Search className="text-gray-500 shrink-0" size={14} />
                  <input
                    type="text"
                    value={rawInput}
                    onChange={(e) => setRawInput(e.target.value)}
                    onKeyDown={handleKeyPress}
                    onPaste={handlePaste}
                    placeholder={isEs ? "Escribe códigos (ej: FWC1, MEX5) separados por espacio..." : "Type sticker codes (e.g. FWC1, MEX5) separated by space..."}
                    className="w-full bg-transparent text-xs text-white placeholder-gray-500 focus:outline-none"
                    disabled={missingCodes.length >= 30}
                  />
                  {rawInput.trim() && (
                    <button
                      onClick={() => handleAddCodes(rawInput)}
                      className="bg-fifa-gold text-black rounded-lg px-2 py-1 text-[10px] font-bold"
                    >
                      {isEs ? "Añadir" : "Add"}
                    </button>
                  )}
                </div>

                {/* Info about parser */}
                <span className="text-[9px] text-gray-500 flex items-center gap-1">
                  <Clipboard size={10} />
                  {isEs 
                    ? "Sugerencia: puedes copiar y pegar la lista de códigos faltantes directamente!" 
                    : "Tip: you can copy and paste your entire list of missing codes directly!"}
                </span>
              </div>

              {/* Suggestions List */}
              {suggestions.length > 0 && (
                <div className="bg-black/30 border border-white/5 rounded-xl p-3 space-y-1">
                  <span className="text-[9px] text-gray-500 font-bold uppercase tracking-wider block mb-1">
                    {isEs ? "Sugerencias rápidas:" : "Quick Suggestions:"}
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {suggestions.map(code => (
                      <button
                        key={code}
                        onClick={() => {
                          if (missingCodes.length < 30) {
                            setMissingCodes(prev => [...prev, code]);
                            setRawInput("");
                            localHaptic("LIGHT");
                          }
                        }}
                        className="px-2.5 py-1 bg-fifa-gold/10 hover:bg-fifa-gold/20 border border-fifa-gold/30 rounded-lg text-[10px] font-black text-fifa-gold transition-all"
                      >
                        + {code}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Render selected Missing Sticker Tag Badges */}
            {missingCodes.length > 0 && (
              <div className="space-y-2 pt-2">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">
                  {isEs ? "Lista de Faltantes (" : "Missing List ("}{missingCodes.length}/30)
                </span>
                <div className="flex flex-wrap gap-1.5 p-3.5 bg-white/[0.01] border border-white/5 rounded-2xl max-h-[140px] overflow-y-auto">
                  {missingCodes.map(code => (
                    <div
                      key={code}
                      className="flex items-center gap-1.5 px-3 py-1 bg-[#1a130c] border border-amber-500/30 rounded-xl text-xs font-bold text-amber-500"
                    >
                      <span>{code}</span>
                      <button
                        onClick={() => handleDeleteCode(code)}
                        className="text-gray-500 hover:text-white transition-colors"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => {
                    setMissingCodes([]);
                    setErrorMsg(null);
                    setWarningMsg(null);
                    localHaptic("MEDIUM");
                  }}
                  className="text-[10px] text-red-400 hover:text-red-300 transition-colors font-bold flex items-center gap-1"
                >
                  <Trash2 size={10} /> {isEs ? "Limpiar Lista" : "Clear List"}
                </button>
              </div>
            )}

            {/* Error & Warning Messages */}
            {errorMsg && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-2xl flex gap-3 text-xs">
                <AlertCircle size={16} className="shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {warningMsg && (
              <div className="p-4 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-2xl flex gap-3 text-xs">
                <AlertCircle size={16} className="shrink-0" />
                <span>{warningMsg}</span>
              </div>
            )}
          </div>

          {/* Footer Action buttons */}
          <div className="p-6 border-t border-white/5 bg-black/40 shrink-0 flex items-center justify-end gap-3">
            <button
              onClick={() => {
                localHaptic("LIGHT");
                onClose();
              }}
              className="px-5 py-3 rounded-xl border border-white/10 hover:bg-white/5 transition-colors text-xs font-bold text-gray-400 hover:text-white"
            >
              {isEs ? "Cancelar" : "Cancel"}
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-3 bg-gradient-to-r from-fifa-gold to-yellow-400 hover:from-yellow-400 hover:to-yellow-500 text-black font-black uppercase rounded-xl shadow-lg shadow-black/40 text-xs flex items-center justify-center gap-2"
            >
              {saving ? (
                <>
                  <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  <span>{isEs ? "Guardando..." : "Saving..."}</span>
                </>
              ) : (
                <>
                  <Check size={14} />
                  <span>{isEs ? "Guardar y Rellenar" : "Save and Auto-Fill"}</span>
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
