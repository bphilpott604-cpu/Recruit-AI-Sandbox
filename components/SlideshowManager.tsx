import React, { useState, useEffect, useRef } from 'react';
import * as api from '../services/api';

type View = 'dashboard' | 'edit-slideshow';

const SlideshowManager: React.FC<{ onLogout: () => void }> = ({ onLogout }) => {
  const [view, setView] = useState<View>('dashboard');
  const [slideshows, setSlideshows] = useState<any[]>([]);
  const [gyms, setGyms] = useState<any[]>([]);
  const [editingSlideshowId, setEditingSlideshowId] = useState<string | null>(null);
  const [editingSlideshow, setEditingSlideshow] = useState<any | null>(null);

  const reload = async () => {
    const [ss, gs] = await Promise.all([api.getSlideshows(), api.getGyms()]);
    setSlideshows(ss);
    setGyms(gs);
  };

  const loadSlideshow = async (id: string) => {
    const ss = await api.getSlideshow(id);
    setEditingSlideshow(ss);
  };

  useEffect(() => { reload(); }, []);

  const handleEditSlideshow = async (id: string) => {
    setEditingSlideshowId(id);
    await loadSlideshow(id);
    setView('edit-slideshow');
  };

  const handleLogout = async () => {
    await api.logout();
    onLogout();
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-600 p-2 rounded-lg">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-800">Gym TV <span className="text-emerald-600 font-normal">Slideshow Manager</span></h1>
              <p className="text-xs text-slate-400">Manage slideshows across all gym locations</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {view === 'edit-slideshow' && (
              <button onClick={() => { setView('dashboard'); reload(); }} className="text-sm text-slate-500 hover:text-slate-800 flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
                Back
              </button>
            )}
            <button onClick={handleLogout} className="text-sm text-slate-400 hover:text-red-500 flex items-center gap-1 transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {view === 'dashboard' && (
          <Dashboard
            slideshows={slideshows}
            gyms={gyms}
            onReload={reload}
            onEditSlideshow={handleEditSlideshow}
          />
        )}
        {view === 'edit-slideshow' && editingSlideshow && (
          <SlideshowEditor
            slideshow={editingSlideshow}
            onUpdate={() => editingSlideshowId && loadSlideshow(editingSlideshowId)}
          />
        )}
      </main>
    </div>
  );
};

// --- Dashboard ---

interface DashboardProps {
  slideshows: any[];
  gyms: any[];
  onReload: () => void;
  onEditSlideshow: (id: string) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ slideshows, gyms, onReload, onEditSlideshow }) => {
  const [showNewSlideshow, setShowNewSlideshow] = useState(false);
  const [showNewGym, setShowNewGym] = useState(false);
  const [newSlideshowName, setNewSlideshowName] = useState('');
  const [newGymName, setNewGymName] = useState('');
  const [newGymAddress, setNewGymAddress] = useState('');

  const handleCreateSlideshow = async () => {
    if (!newSlideshowName.trim()) return;
    await api.createSlideshow(newSlideshowName.trim());
    setNewSlideshowName('');
    setShowNewSlideshow(false);
    onReload();
  };

  const handleCreateGym = async () => {
    if (!newGymName.trim()) return;
    await api.addGym(newGymName.trim(), newGymAddress.trim());
    setNewGymName('');
    setNewGymAddress('');
    setShowNewGym(false);
    onReload();
  };

  const handleAssignSlideshow = async (gymId: string, slideshowId: string | null) => {
    await api.updateGym(gymId, { assignedSlideshowId: slideshowId });
    onReload();
  };

  const handleDeleteSlideshow = async (id: string) => {
    if (confirm('Delete this slideshow? It will be unassigned from any gyms.')) {
      await api.deleteSlideshow(id);
      onReload();
    }
  };

  const handleDeleteGym = async (id: string) => {
    if (confirm('Remove this gym location?')) {
      await api.deleteGym(id);
      onReload();
    }
  };

  const getDisplayUrl = (displayToken: string) => {
    return `${window.location.origin}${window.location.pathname}#/display/${displayToken}`;
  };

  return (
    <div className="space-y-8">
      {/* Slideshows Section */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-800">Slideshows</h2>
          <button
            onClick={() => setShowNewSlideshow(true)}
            className="px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition-colors"
          >
            + New Slideshow
          </button>
        </div>

        {showNewSlideshow && (
          <div className="bg-white p-4 rounded-xl border border-slate-200 mb-4 flex gap-3 items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium text-slate-600 mb-1">Slideshow Name</label>
              <input
                value={newSlideshowName}
                onChange={e => setNewSlideshowName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleCreateSlideshow()}
                placeholder="e.g. March Promotions"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                autoFocus
              />
            </div>
            <button onClick={handleCreateSlideshow} className="px-4 py-2 bg-emerald-600 text-white text-sm rounded-lg hover:bg-emerald-700">Create</button>
            <button onClick={() => setShowNewSlideshow(false)} className="px-4 py-2 text-slate-500 text-sm rounded-lg hover:bg-slate-100">Cancel</button>
          </div>
        )}

        {slideshows.length === 0 ? (
          <div className="bg-white border-2 border-dashed border-slate-200 rounded-xl p-8 text-center text-slate-400">
            <p className="text-lg font-medium">No slideshows yet</p>
            <p className="text-sm mt-1">Create your first slideshow to get started.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {slideshows.map((s: any) => {
              const assignedGyms = gyms.filter((g: any) => g.assigned_slideshow_id === s.id);
              return (
                <div key={s.id} className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="font-semibold text-slate-800">{s.name}</h3>
                    <button onClick={() => handleDeleteSlideshow(s.id)} className="text-slate-300 hover:text-red-500 transition-colors" title="Delete">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-slate-500 mb-4">
                    <span>{s.slide_count} slide{s.slide_count !== 1 ? 's' : ''}</span>
                    <span>{assignedGyms.length} gym{assignedGyms.length !== 1 ? 's' : ''}</span>
                  </div>
                  <button
                    onClick={() => onEditSlideshow(s.id)}
                    className="w-full py-2 text-sm font-medium text-emerald-600 bg-emerald-50 rounded-lg hover:bg-emerald-100 transition-colors"
                  >
                    Edit Slides
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Gym Locations Section */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-800">Gym Locations</h2>
          <button
            onClick={() => setShowNewGym(true)}
            className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
          >
            + Add Gym
          </button>
        </div>

        {showNewGym && (
          <div className="bg-white p-4 rounded-xl border border-slate-200 mb-4 flex gap-3 items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium text-slate-600 mb-1">Gym Name</label>
              <input
                value={newGymName}
                onChange={e => setNewGymName(e.target.value)}
                placeholder="e.g. Downtown Fitness"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                autoFocus
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-slate-600 mb-1">Address</label>
              <input
                value={newGymAddress}
                onChange={e => setNewGymAddress(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleCreateGym()}
                placeholder="e.g. 123 Main St"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
              />
            </div>
            <button onClick={handleCreateGym} className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700">Add</button>
            <button onClick={() => setShowNewGym(false)} className="px-4 py-2 text-slate-500 text-sm rounded-lg hover:bg-slate-100">Cancel</button>
          </div>
        )}

        {gyms.length === 0 ? (
          <div className="bg-white border-2 border-dashed border-slate-200 rounded-xl p-8 text-center text-slate-400">
            <p className="text-lg font-medium">No gym locations added</p>
            <p className="text-sm mt-1">Add your gym locations to assign slideshows to them.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {gyms.map((g: any) => {
              const assigned = slideshows.find((s: any) => s.id === g.assigned_slideshow_id);
              return (
                <div key={g.id} className="bg-white rounded-xl border border-slate-200 p-5">
                  <div className="flex items-center justify-between flex-wrap gap-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-slate-800">{g.name}</h3>
                      {g.address && <p className="text-sm text-slate-400">{g.address}</p>}
                    </div>
                    <div className="flex items-center gap-3">
                      <select
                        value={g.assigned_slideshow_id ?? ''}
                        onChange={e => handleAssignSlideshow(g.id, e.target.value || null)}
                        className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                      >
                        <option value="">No slideshow assigned</option>
                        {slideshows.map((s: any) => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                      {g.assigned_slideshow_id && (
                        <button
                          onClick={() => {
                            const url = getDisplayUrl(g.display_token);
                            navigator.clipboard.writeText(url);
                            alert(`TV display URL copied!\n\n${url}\n\nOpen this URL on the gym TV's browser.`);
                          }}
                          className="px-3 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors whitespace-nowrap"
                          title="Copy TV display URL"
                        >
                          Copy TV URL
                        </button>
                      )}
                      <button onClick={() => handleDeleteGym(g.id)} className="text-slate-300 hover:text-red-500 transition-colors" title="Remove gym">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </div>
                  </div>
                  {assigned && (
                    <div className="mt-3 flex items-center gap-2 text-xs text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg w-fit">
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                      Playing: {assigned.name} ({assigned.slide_count} slides)
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};

// --- Slideshow Editor ---

interface SlideshowEditorProps {
  slideshow: any;
  onUpdate: () => void;
}

const SlideshowEditor: React.FC<SlideshowEditorProps> = ({ slideshow, onUpdate }) => {
  const [slides, setSlides] = useState<any[]>(slideshow.slides || []);
  const [name, setName] = useState(slideshow.name);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setSlides(slideshow.slides || []);
    setName(slideshow.name);
  }, [slideshow]);

  const saveName = async (n: string) => {
    setName(n);
    await api.updateSlideshow(slideshow.id, n);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    setUploading(true);
    for (const file of Array.from(files) as File[]) {
      const isImage = file.type.startsWith('image/');
      const isVideo = file.type.startsWith('video/');
      if (!isImage && !isVideo) continue;
      await api.addSlide(slideshow.id, {
        title: file.name.replace(/\.[^.]+$/, ''),
        description: '',
        durationSeconds: isVideo ? 0 : 8,
        file: file,
      });
    }
    setUploading(false);
    onUpdate();
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRemoveSlide = async (id: string) => {
    await api.deleteSlide(slideshow.id, id);
    onUpdate();
  };

  const handleUpdateSlide = async (id: string, updates: { title?: string; description?: string; durationSeconds?: number }) => {
    await api.updateSlide(slideshow.id, id, updates);
    // Update local state immediately for responsiveness
    setSlides(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
  };

  const handleDragStart = (index: number) => {
    setDragIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === index) return;
    const reordered = [...slides];
    const [moved] = reordered.splice(dragIndex, 1);
    reordered.splice(index, 0, moved);
    setSlides(reordered);
    setDragIndex(index);
  };

  const handleDragEnd = async () => {
    setDragIndex(null);
    await api.reorderSlides(slideshow.id, slides.map(s => s.id));
  };

  const moveSlide = async (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= slides.length) return;
    const reordered = [...slides];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
    setSlides(reordered);
    await api.reorderSlides(slideshow.id, reordered.map(s => s.id));
  };

  const getMediaUrl = (slide: any) => {
    return `/${slide.image_path}`;
  };

  const isVideo = (slide: any) => slide.media_type === 'video';

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          onBlur={e => saveName(e.target.value)}
          className="text-2xl font-bold text-slate-800 bg-transparent border-b-2 border-transparent hover:border-slate-200 focus:border-emerald-500 outline-none px-1 py-1 transition-colors"
        />
        <span className="text-sm text-slate-400">{slides.length} slide{slides.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Upload area */}
      <div
        onClick={() => !uploading && fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${uploading ? 'border-emerald-300 bg-emerald-50/50' : 'border-slate-300 cursor-pointer hover:border-emerald-400 hover:bg-emerald-50/50'}`}
      >
        {uploading ? (
          <>
            <svg className="w-10 h-10 mx-auto text-emerald-400 mb-2 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p className="text-sm text-emerald-600 font-medium">Uploading...</p>
          </>
        ) : (
          <>
            <svg className="w-10 h-10 mx-auto text-slate-300 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="text-sm text-slate-500 font-medium">Click to upload images or videos</p>
            <p className="text-xs text-slate-400 mt-1">PNG, JPG, GIF, MP4, MOV. Multiple files supported.</p>
          </>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*"
          multiple
          onChange={handleFileUpload}
          className="hidden"
        />
      </div>

      {/* Slide list */}
      {slides.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          <p>No slides yet. Upload some images above.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {slides.map((slide: any, index: number) => (
            <div
              key={slide.id}
              draggable
              onDragStart={() => handleDragStart(index)}
              onDragOver={e => handleDragOver(e, index)}
              onDragEnd={handleDragEnd}
              className={`bg-white rounded-xl border border-slate-200 p-4 flex gap-4 items-start transition-all ${dragIndex === index ? 'opacity-50 scale-[0.98]' : ''}`}
            >
              {/* Drag handle & order */}
              <div className="flex flex-col items-center gap-1 pt-2 cursor-grab active:cursor-grabbing">
                <button onClick={() => moveSlide(index, -1)} disabled={index === 0} className="text-slate-300 hover:text-slate-500 disabled:opacity-30">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 15l7-7 7 7" /></svg>
                </button>
                <span className="text-xs font-bold text-slate-300">{index + 1}</span>
                <button onClick={() => moveSlide(index, 1)} disabled={index === slides.length - 1} className="text-slate-300 hover:text-slate-500 disabled:opacity-30">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                </button>
              </div>

              {/* Thumbnail */}
              <div className="w-32 h-20 rounded-lg overflow-hidden bg-slate-100 flex-shrink-0 relative">
                {isVideo(slide) ? (
                  <>
                    <video src={getMediaUrl(slide)} className="w-full h-full object-cover" muted />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                      <svg className="w-8 h-8 text-white/90" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                    </div>
                  </>
                ) : (
                  <img src={getMediaUrl(slide)} alt={slide.title} className="w-full h-full object-cover" />
                )}
              </div>

              {/* Details */}
              <div className="flex-1 space-y-2">
                <input
                  defaultValue={slide.title}
                  onBlur={e => handleUpdateSlide(slide.id, { title: e.target.value })}
                  className="w-full text-sm font-medium text-slate-800 bg-transparent border-b border-transparent hover:border-slate-200 focus:border-emerald-500 outline-none px-1"
                  placeholder="Slide title"
                />
                <input
                  defaultValue={slide.description}
                  onBlur={e => handleUpdateSlide(slide.id, { description: e.target.value })}
                  className="w-full text-xs text-slate-500 bg-transparent border-b border-transparent hover:border-slate-200 focus:border-emerald-500 outline-none px-1"
                  placeholder="Optional description"
                />
                {isVideo(slide) ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded font-medium">Video — plays full length</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-slate-400">Duration:</label>
                    <input
                      type="number"
                      min={1}
                      max={120}
                      defaultValue={slide.duration_seconds}
                      onBlur={e => handleUpdateSlide(slide.id, { durationSeconds: parseInt(e.target.value) || 8 })}
                      className="w-16 text-xs px-2 py-1 border border-slate-200 rounded text-center focus:ring-1 focus:ring-emerald-500 outline-none"
                    />
                    <span className="text-xs text-slate-400">seconds</span>
                  </div>
                )}
              </div>

              {/* Remove */}
              <button onClick={() => handleRemoveSlide(slide.id)} className="text-slate-300 hover:text-red-500 transition-colors mt-2" title="Remove slide">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SlideshowManager;
