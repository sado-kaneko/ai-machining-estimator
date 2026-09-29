export interface Drawing {
  id: number;
  originalName: string;
  storedName: string;
  fileSize: number;
  createdAt: string;
}

export interface DrawingListResponse {
  items: Drawing[];
}
