
export interface GeneratedAssets {
  jobDescription: string;
  interviewGuide: string;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

// Gym TV Slideshow Types

export interface Slide {
  id: string;
  title: string;
  imageUrl: string; // base64 data URL or remote URL
  description: string;
  durationSeconds: number; // how long to display this slide
  createdAt: string;
}

export interface Slideshow {
  id: string;
  name: string;
  slides: Slide[];
  updatedAt: string;
  createdAt: string;
}

export interface GymLocation {
  id: string;
  name: string;
  address: string;
  assignedSlideshowId: string | null;
}

export interface SlideshowManagerState {
  slideshows: Slideshow[];
  gyms: GymLocation[];
}
