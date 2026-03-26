import React, { useState, useEffect, useRef } from 'react';
import { Slideshow, GymLocation, Slide } from '../types';
import * as svc from '../services/slideshowService';

type View = 'dashboard' | 'edit-slideshow';

const SlideshowManager: React.FC = () => {
  const [view, setView] = useState<View>('dashboard');
  const [slideshows, setSlideshows] = useState<Slideshow[]>([]);
  const [gyms, setGyms] = useState<GymLocation[]>([]);
  const [editingSlideshowId, setEditingSlideshowId] = useState<string | null>(null);

  const reload = () => {
    setSlideshows(svc.getSlideshows());
    setGyms(svc.getGyms());
  };

  useEffect(() => { reload(); }, []);

  const editingSlideshow = slideshows.find(s => s.id === editingSlideshowId) ?? null;

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
          {view === 'edit-slideshow' && (
            <button onClick={() => { setView('dashboard'); reload(); }} className="text-sm text-slate-500 hover:text-slate-800 flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
              Back to Dashboard
            </button>
          )}
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {view === 'dashboard' && (
          <Dashboard
            slideshows={slideshows}
            gyms={gyms}
            onReload={reload}
            onEditSlideshow={(id) => { setEditingSlideshowId(id); setView('edit-slideshow'); }}
          />
        )}
        {view === 'edit-slideshow' && editingSlideshow && (
          <SlideshowEditor slideshow={editingSlideshow} onUpdate={reload} />
        )}
      </main>
    </div>
  );
};

// --- Dashboard ---

interface DashboardProps {
  slideshows: Slideshow[];
  gyms: GymLocation[];
  onReload: () => void;
  onEditSlideshow: (id: string) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ slideshows, gyms, onReload, onEditSlideshow }) => {
  const [showNewSlideshow, setShowNewSlideshow] = useState(false);
  const [showNewGym, setShowNewGym] = useState(false);
  const [newSlideshowName, setNewSlideshowName] = useState('');
  const [newGymName, setNewGymName] = useState('');
  const [newGymAddress, setNewGymAddress] = useState('');

  const handleCreateSlideshow = () => {
    if (!newSlideshowName.trim()) return;
    svc.createSlideshow(newSlideshowName.trim());
    setNewSlideshowName('');
    setShowNewSlideshow(false);
    onReload();
  };

  const handleCreateGym = () => {
    if (!newGymName.trim()) return;
    svc.addGym(newGymName.trim(), newGymAddress.trim());
    setNewGymName('');
    setNewGymAddress('');
    setShowNewGym(false);
    onReload();
  };

  const handleAssignSlideshow = (gymId: string, slideshowId: string | null) => {
    svc.updateGym(gymId, { assignedSlideshowId: slideshowId });
    onReload();
  };

  const handleDeleteSlideshow = (id: string) => {
    if (confirm('Delete this slideshow? It will be unassigned from any gyms.')) {
      svc.deleteSlideshow(id);
      onReload();
    }
  };

  const handleDeleteGym = (id: string) => {
    if (confirm('Remove this gym location?')) {
      svc.deleteGym(id);
      onReload();
    }
  };

  const getDisplayUrl = (gymId: string) => {
    return `${window.location.origin}${window.location.pathname}#/display/${gymId}`;
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
            {slideshows.map(s => {
              const assignedGyms = gyms.filter(g => g.assignedSlideshowId === s.id);
              return (
                <div key={s.id} className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="font-semibold text-slate-800">{s.name}</h3>
                    <button onClick={() => handleDeleteSlideshow(s.id)} className="text-slate-300 hover:text-red-500 transition-colors" title="Delete">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-slate-500 mb-4">
                    <span>{s.slides.length} slide{s.slides.length !== 1 ? 's' : ''}</span>
                    <span>{assignedGyms.length} gym{assignedGyms.length !== 1 ? 's' : ''}</span>
                  </div>
                  {s.slides.length > 0 && (
                    <div className="flex gap-1 mb-4 overflow-hidden rounded-lg h-16">
                      {s.slides.slice(0, 4).map(slide => (
                        <div key={slide.id} className="flex-1 bg-slate-100 overflow-hidden">
                          <img src={slide.imageUrl} alt={slide.title} className="w-full h-full object-cover" />
                        </div>
                      ))}
                      {s.slides.length > 4 && (
                        <div className="flex-1 bg-slate-200 flex items-center justify-center text-xs font-medium text-slate-500">
                          +{s.slides.length - 4}
                        </div>
                      )}
                    </div>
                  )}
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
            {gyms.map(g => {
              const assigned = slideshows.find(s => s.id === g.assignedSlideshowId);
              return (
                <div key={g.id} className="bg-white rounded-xl border border-slate-200 p-5">
                  <div className="flex items-center justify-between flex-wrap gap-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-slate-800">{g.name}</h3>
                      {g.address && <p className="text-sm text-slate-400">{g.address}</p>}
                    </div>
                    <div className="flex items-center gap-3">
                      <select
                        value={g.assignedSlideshowId ?? ''}
                        onChange={e => handleAssignSlideshow(g.id, e.target.value || null)}
                        className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                      >
                        <option value="">No slideshow assigned</option>
                        {slideshows.map(s => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                      {g.assignedSlideshowId && (
                        <button
                          onClick={() => {
                            const url = getDisplayUrl(g.id);
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
                      Playing: {assigned.name} ({assigned.slides.length} slides)
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
  slideshow: Slideshow;
  onUpdate: () => void;
}

const SlideshowEditor: React.FC<SlideshowEditorProps> = ({ slideshow, onUpdate }) => {
  const [slides, setSlides] = useState<Slide[]>(slideshow.slides);
  const [name, setName] = useState(slideshow.name);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const saveSlides = (updated: Slide[]) => {
    setSlides(updated);
    svc.updateSlideshow(slideshow.id, { slides: updated });
    onUpdate();
  };

  const saveName = (n: string) => {
    setName(n);
    svc.updateSlideshow(slideshow.id, { name: n });
    onUpdate();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    for (const file of Array.from(files) as File[]) {
      if (!file.type.startsWith('image/')) continue;
      const dataUrl = await svc.fileToDataUrl(file);
      const newSlide: Slide = {
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
        title: file.name.replace(/\.[^.]+$/, ''),
        imageUrl: dataUrl,
        description: '',
        durationSeconds: 8,
        createdAt: new Date().toISOString(),
      };
      slides.push(newSlide);
    }
    saveSlides([...slides]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRemoveSlide = (id: string) => {
    saveSlides(slides.filter(s => s.id !== id));
  };

  const handleUpdateSlide = (id: string, updates: Partial<Pick<Slide, 'title' | 'description' | 'durationSeconds'>>) => {
    saveSlides(slides.map(s => s.id === id ? { ...s, ...updates } : s));
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

  const handleDragEnd = () => {
    setDragIndex(null);
    saveSlides([...slides]);
  };

  const moveSlide = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= slides.length) return;
    const reordered = [...slides];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
    saveSlides(reordered);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <input
          value={name}
          onChange={e => saveName(e.target.value)}
          className="text-2xl font-bold text-slate-800 bg-transparent border-b-2 border-transparent hover:border-slate-200 focus:border-emerald-500 outline-none px-1 py-1 transition-colors"
        />
        <span className="text-sm text-slate-400">{slides.length} slide{slides.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Upload area */}
      <div
        onClick={() => fileInputRef.current?.click()}
        className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center cursor-pointer hover:border-emerald-400 hover:bg-emerald-50/50 transition-colors"
      >
        <svg className="w-10 h-10 mx-auto text-slate-300 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <p className="text-sm text-slate-500 font-medium">Click to upload images</p>
        <p className="text-xs text-slate-400 mt-1">PNG, JPG, or GIF. Multiple files supported.</p>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
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
          {slides.map((slide, index) => (
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
              <div className="w-32 h-20 rounded-lg overflow-hidden bg-slate-100 flex-shrink-0">
                <img src={slide.imageUrl} alt={slide.title} className="w-full h-full object-cover" />
              </div>

              {/* Details */}
              <div className="flex-1 space-y-2">
                <input
                  value={slide.title}
                  onChange={e => handleUpdateSlide(slide.id, { title: e.target.value })}
                  className="w-full text-sm font-medium text-slate-800 bg-transparent border-b border-transparent hover:border-slate-200 focus:border-emerald-500 outline-none px-1"
                  placeholder="Slide title"
                />
                <input
                  value={slide.description}
                  onChange={e => handleUpdateSlide(slide.id, { description: e.target.value })}
                  className="w-full text-xs text-slate-500 bg-transparent border-b border-transparent hover:border-slate-200 focus:border-emerald-500 outline-none px-1"
                  placeholder="Optional description"
                />
                <div className="flex items-center gap-2">
                  <label className="text-xs text-slate-400">Duration:</label>
                  <input
                    type="number"
                    min={1}
                    max={120}
                    value={slide.durationSeconds}
                    onChange={e => handleUpdateSlide(slide.id, { durationSeconds: parseInt(e.target.value) || 8 })}
                    className="w-16 text-xs px-2 py-1 border border-slate-200 rounded text-center focus:ring-1 focus:ring-emerald-500 outline-none"
                  />
                  <span className="text-xs text-slate-400">seconds</span>
                </div>
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
