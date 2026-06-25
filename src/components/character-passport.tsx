"use client";

interface CharacterPassportProps {
  character: {
    id: string;
    name: string;
    description: string;
    age?: string | null;
    gender?: string | null;
    style?: string | null;
    outfit?: string | null;
    personality?: string | null;
    hairDescription?: string | null;
    faceDescription?: string | null;
    eyeColor?: string | null;
    bodyType?: string | null;
    colorPalette?: string | null;
    createdAt: string;
    generationCount: number;
  };
  referenceImageUrl?: string | null;
  onEdit: () => void;
}

export function CharacterPassport({ character, referenceImageUrl, onEdit }: CharacterPassportProps) {
  const traits = [
    { label: "PERSONALITY", value: character.personality },
    { label: "HAIR", value: character.hairDescription },
    { label: "FACE", value: character.faceDescription },
    { label: "OUTFIT", value: character.outfit },
    { label: "EYES", value: character.eyeColor },
    { label: "BODY", value: character.bodyType },
  ].filter((t) => t.value && t.value.trim().length > 0);

  const pills = [character.age, character.gender, character.style].filter(
    (v): v is string => !!v && v.trim().length > 0
  );

  const colorPaletteItems = character.colorPalette
    ? character.colorPalette.split(/[,]+/).map((s) => s.trim()).filter((s) => s.length > 0)
    : [];

  const createdDate = new Date(character.createdAt).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });

  return (
    <div className="rounded-2xl border border-white/[0.12] bg-[rgba(10,10,10,0.75)] backdrop-blur-sm p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] mb-6">
      {/* Header: image + name + edit */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Reference image */}
        <div className="flex justify-center sm:justify-start shrink-0">
          <div className="w-20 h-20 rounded-xl border border-white/[0.12] overflow-hidden bg-[#0a0a0a]">
            {referenceImageUrl ? (
              <img src={referenceImageUrl} alt={character.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-white/5 border border-white/[0.08] rounded-xl">
                <span className="text-[22px] font-bold text-white/30">
                  {character.name.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Name, pills, edit */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-[22px] font-bold text-white truncate">{character.name}</h1>
              {pills.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {pills.map((pill) => (
                    <span
                      key={pill}
                      className="text-[11px] text-white/50 bg-white/[0.05] px-2.5 py-1 rounded-full border border-white/[0.08]"
                    >
                      {pill}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <button
              onClick={onEdit}
              className="shrink-0 flex items-center gap-1.5 text-[12px] text-white/40 hover:text-white border border-white/[0.08] hover:border-white/20 px-3 py-1.5 rounded-full transition-colors"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
              Edit
            </button>
          </div>
        </div>
      </div>

      {/* Bio */}
      <div className="mt-5">
        <p className="text-[10px] font-medium text-white/30 uppercase tracking-widest mb-1.5">BIO</p>
        <p className="text-[13px] text-[#81a0bb] leading-relaxed line-clamp-3">{character.description}</p>
      </div>

      {/* Stats row */}
      <div className="border-t border-white/[0.06] my-4" />
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          {character.generationCount > 0 ? (
            <>
              <span className="text-[20px] font-bold text-[#e8702a]">{character.generationCount}</span>
              <span className="text-[11px] text-white/40">generations</span>
            </>
          ) : (
            <span className="text-[13px] text-white/30">No scenes yet</span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-white/30">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          <span className="text-[13px] text-white/50">Created {createdDate}</span>
        </div>
      </div>

      {/* Traits grid */}
      {traits.length > 0 && (
        <>
          <div className="border-t border-white/[0.06] my-4" />
          <p className="text-[10px] font-medium text-white/30 uppercase tracking-widest mb-3">TRAITS</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {traits.map((trait) => (
              <div
                key={trait.label}
                className="border border-white/[0.08] rounded-xl p-3 bg-white/[0.02]"
              >
                <p className="text-[9px] uppercase tracking-widest text-white/30 mb-1">{trait.label}</p>
                <p className="text-[12px] text-white/70 leading-snug">{trait.value}</p>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Color Palette */}
      {colorPaletteItems.length > 0 && (
        <>
          <div className="border-t border-white/[0.06] my-4" />
          <p className="text-[10px] font-medium text-white/30 uppercase tracking-widest mb-3">COLOR PALETTE</p>
          <div className="flex flex-wrap gap-2">
            {colorPaletteItems.map((color, i) => (
              <span
                key={i}
                className="text-[11px] text-white/60 bg-white/[0.05] border border-white/[0.08] rounded-full px-3 py-1"
              >
                {color}
              </span>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
