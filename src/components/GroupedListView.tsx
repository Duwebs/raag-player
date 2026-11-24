import React from 'react';
import { Folder, User, Disc, ListMusic, Plus, Music } from 'lucide-react';
import { Track, Playlist } from '../types';

interface GroupedListViewProps {
  type: 'folders' | 'artists' | 'albums' | 'playlists';
  tracks: Track[];
  playlists: Playlist[];
  onSelectGroup: (name: string, tracks: Track[]) => void;
  onCreatePlaylist: () => void;
}

export const GroupedListView: React.FC<GroupedListViewProps> = ({
  type,
  tracks,
  playlists,
  onSelectGroup,
  onCreatePlaylist,
}) => {
  if (type === 'playlists') {
    return (
      <div className="p-4 space-y-3">
        {/* Create Playlist Button */}
        <button
          onClick={onCreatePlaylist}
          className="w-full p-4 rounded-2xl bg-[#121214] border border-[#1E1E22] hover:bg-[#18181C] active:scale-[0.99] transition-all flex items-center gap-3.5 text-left"
        >
          <div className="w-12 h-12 rounded-xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-[#38BDF8]">
            <Plus className="w-6 h-6 stroke-[2]" />
          </div>
          <div>
            <div className="text-[15px] font-semibold text-white">New Playlist</div>
            <div className="text-xs text-zinc-500">Create a personalized mix</div>
          </div>
        </button>

        {playlists.map((pl) => {
          const plTracks = tracks.filter((t) => pl.trackIds.includes(t.id));
          return (
            <div
              key={pl.id}
              onClick={() => onSelectGroup(pl.name, plTracks)}
              className="p-3.5 rounded-2xl bg-[#121214] border border-[#1E1E22] hover:bg-[#18181C] cursor-pointer flex items-center justify-between transition-all"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-12 h-12 rounded-xl bg-[#1A1A1E] flex items-center justify-center text-[#38BDF8]">
                  <ListMusic className="w-6 h-6" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-sm font-semibold text-white truncate">{pl.name}</h4>
                  <p className="text-xs text-zinc-400">{plTracks.length} songs</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // Group by Folders, Artists, or Albums
  const grouped = React.useMemo(() => {
    const map = new Map<string, Track[]>();

    tracks.forEach((track) => {
      let key = 'Unknown';
      if (type === 'folders') key = track.folder || 'Downloads';
      else if (type === 'artists') key = track.artist || 'Unknown Artist';
      else if (type === 'albums') key = track.album || 'Unknown Album';

      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(track);
    });

    return Array.from(map.entries()).sort((a, b) => b[1].length - a[1].length);
  }, [tracks, type]);

  const getIcon = () => {
    if (type === 'folders') return <Folder className="w-6 h-6 text-amber-400" />;
    if (type === 'artists') return <User className="w-6 h-6 text-[#38BDF8]" />;
    return <Disc className="w-6 h-6 text-rose-400" />;
  };

  return (
    <div className="p-4 space-y-2.5">
      {grouped.map(([groupName, groupTracks]) => {
        const firstArt = groupTracks.find((t) => t.coverArt)?.coverArt;
        return (
          <div
            key={groupName}
            onClick={() => onSelectGroup(groupName, groupTracks)}
            className="p-3 rounded-2xl bg-[#121214] border border-[#1E1E22] hover:bg-[#18181C] active:scale-[0.99] cursor-pointer flex items-center justify-between transition-all"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-12 h-12 rounded-xl bg-[#1A1A1E] border border-white/5 overflow-hidden flex items-center justify-center flex-shrink-0">
                {firstArt ? (
                  <img src={firstArt} alt={groupName} className="w-full h-full object-cover" />
                ) : (
                  getIcon()
                )}
              </div>
              <div className="min-w-0">
                <h4 className="text-[15px] font-semibold text-white truncate">{groupName}</h4>
                <p className="text-xs text-zinc-400">{groupTracks.length} songs</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
