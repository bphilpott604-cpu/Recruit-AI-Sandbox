// Frontend API client — replaces localStorage-based service

async function request(path: string, options?: RequestInit) {
  const res = await fetch(path, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options?.headers },
  });
  if (res.status === 401) {
    window.dispatchEvent(new CustomEvent('auth:expired'));
    throw new Error('Not authenticated');
  }
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `Request failed: ${res.status}`);
  }
  return res.json();
}

// --- Auth ---

export async function login(password: string): Promise<boolean> {
  const data = await request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ password }),
  });
  return data.ok;
}

export async function logout(): Promise<void> {
  await request('/api/auth/logout', { method: 'POST' });
}

export async function checkAuth(): Promise<boolean> {
  const data = await request('/api/auth/check');
  return data.authenticated;
}

// --- Slideshows ---

export async function getSlideshows() {
  return request('/api/slideshows');
}

export async function getSlideshow(id: string) {
  return request(`/api/slideshows/${id}`);
}

export async function createSlideshow(name: string) {
  return request('/api/slideshows', {
    method: 'POST',
    body: JSON.stringify({ name }),
  });
}

export async function updateSlideshow(id: string, name: string) {
  return request(`/api/slideshows/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ name }),
  });
}

export async function deleteSlideshow(id: string) {
  return request(`/api/slideshows/${id}`, { method: 'DELETE' });
}

// --- Slides ---

export async function addSlide(slideshowId: string, data: { title: string; description: string; durationSeconds: number; file?: File; imageData?: string; mediaData?: string }) {
  if (data.file) {
    // Multipart form upload — efficient for large files (no base64 inflation)
    const formData = new FormData();
    formData.append('file', data.file);
    formData.append('title', data.title);
    formData.append('description', data.description);
    formData.append('durationSeconds', String(data.durationSeconds));

    const res = await fetch(`/api/slideshows/${slideshowId}/slides`, {
      method: 'POST',
      body: formData,
      // Note: do NOT set Content-Type header — browser sets it with boundary
    });
    if (res.status === 401) {
      window.dispatchEvent(new CustomEvent('auth:expired'));
      throw new Error('Not authenticated');
    }
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Upload failed: ${res.status}`);
    }
    return res.json();
  }

  // Legacy base64 JSON fallback
  return request(`/api/slideshows/${slideshowId}/slides`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateSlide(slideshowId: string, slideId: string, updates: { title?: string; description?: string; durationSeconds?: number }) {
  return request(`/api/slideshows/${slideshowId}/slides/${slideId}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
}

export async function deleteSlide(slideshowId: string, slideId: string) {
  return request(`/api/slideshows/${slideshowId}/slides/${slideId}`, { method: 'DELETE' });
}

export async function reorderSlides(slideshowId: string, slideIds: string[]) {
  return request(`/api/slideshows/${slideshowId}/slides/reorder`, {
    method: 'PUT',
    body: JSON.stringify({ slideIds }),
  });
}

// --- Gyms ---

export async function getGyms() {
  return request('/api/gyms');
}

export async function addGym(name: string, address: string) {
  return request('/api/gyms', {
    method: 'POST',
    body: JSON.stringify({ name, address }),
  });
}

export async function updateGym(id: string, updates: { name?: string; address?: string; assignedSlideshowId?: string | null }) {
  return request(`/api/gyms/${id}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
}

export async function deleteGym(id: string) {
  return request(`/api/gyms/${id}`, { method: 'DELETE' });
}

// --- Display (public, no auth needed) ---

export async function getDisplaySlideshow(token: string) {
  const res = await fetch(`/api/display/${token}`);
  if (!res.ok) return null;
  return res.json();
}

// --- File helper ---

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
