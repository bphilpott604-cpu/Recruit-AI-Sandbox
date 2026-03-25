import { Slide, Slideshow, GymLocation, SlideshowManagerState } from '../types';

const STORAGE_KEY = 'gym-slideshow-manager';

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function loadState(): SlideshowManagerState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { slideshows: [], gyms: [] };
}

function saveState(state: SlideshowManagerState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

// --- Gym Locations ---

export function getGyms(): GymLocation[] {
  return loadState().gyms;
}

export function addGym(name: string, address: string): GymLocation {
  const state = loadState();
  const gym: GymLocation = { id: generateId(), name, address, assignedSlideshowId: null };
  state.gyms.push(gym);
  saveState(state);
  return gym;
}

export function updateGym(id: string, updates: Partial<Pick<GymLocation, 'name' | 'address' | 'assignedSlideshowId'>>): GymLocation | null {
  const state = loadState();
  const gym = state.gyms.find(g => g.id === id);
  if (!gym) return null;
  Object.assign(gym, updates);
  saveState(state);
  return gym;
}

export function deleteGym(id: string): void {
  const state = loadState();
  state.gyms = state.gyms.filter(g => g.id !== id);
  saveState(state);
}

// --- Slideshows ---

export function getSlideshows(): Slideshow[] {
  return loadState().slideshows;
}

export function getSlideshow(id: string): Slideshow | null {
  return loadState().slideshows.find(s => s.id === id) ?? null;
}

export function getSlideshowForGym(gymId: string): Slideshow | null {
  const state = loadState();
  const gym = state.gyms.find(g => g.id === gymId);
  if (!gym?.assignedSlideshowId) return null;
  return state.slideshows.find(s => s.id === gym.assignedSlideshowId) ?? null;
}

export function createSlideshow(name: string): Slideshow {
  const state = loadState();
  const now = new Date().toISOString();
  const slideshow: Slideshow = { id: generateId(), name, slides: [], updatedAt: now, createdAt: now };
  state.slideshows.push(slideshow);
  saveState(state);
  return slideshow;
}

export function updateSlideshow(id: string, updates: Partial<Pick<Slideshow, 'name' | 'slides'>>): Slideshow | null {
  const state = loadState();
  const slideshow = state.slideshows.find(s => s.id === id);
  if (!slideshow) return null;
  if (updates.name !== undefined) slideshow.name = updates.name;
  if (updates.slides !== undefined) slideshow.slides = updates.slides;
  slideshow.updatedAt = new Date().toISOString();
  saveState(state);
  return slideshow;
}

export function deleteSlideshow(id: string): void {
  const state = loadState();
  // Unassign from any gyms
  state.gyms.forEach(g => {
    if (g.assignedSlideshowId === id) g.assignedSlideshowId = null;
  });
  state.slideshows = state.slideshows.filter(s => s.id !== id);
  saveState(state);
}

// --- Slides ---

export function addSlide(slideshowId: string, slide: Omit<Slide, 'id' | 'createdAt'>): Slide | null {
  const state = loadState();
  const slideshow = state.slideshows.find(s => s.id === slideshowId);
  if (!slideshow) return null;
  const newSlide: Slide = { ...slide, id: generateId(), createdAt: new Date().toISOString() };
  slideshow.slides.push(newSlide);
  slideshow.updatedAt = new Date().toISOString();
  saveState(state);
  return newSlide;
}

export function removeSlide(slideshowId: string, slideId: string): void {
  const state = loadState();
  const slideshow = state.slideshows.find(s => s.id === slideshowId);
  if (!slideshow) return;
  slideshow.slides = slideshow.slides.filter(s => s.id !== slideId);
  slideshow.updatedAt = new Date().toISOString();
  saveState(state);
}

export function reorderSlides(slideshowId: string, slideIds: string[]): void {
  const state = loadState();
  const slideshow = state.slideshows.find(s => s.id === slideshowId);
  if (!slideshow) return;
  const slideMap = new Map(slideshow.slides.map(s => [s.id, s]));
  slideshow.slides = slideIds.map(id => slideMap.get(id)!).filter(Boolean);
  slideshow.updatedAt = new Date().toISOString();
  saveState(state);
}

// --- File to Base64 helper ---

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
