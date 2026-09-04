export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      libraries: {
        Row: { id: string; name: string; slug: string; created_at: string };
        Insert: { id?: string; name: string; slug: string; created_at?: string };
        Update: { id?: string; name?: string; slug?: string; created_at?: string };
        Relationships: [];
      };
      songs: {
        Row: {
          album: string | null;
          artist: string | null;
          audio_path: string;
          cover_path: string | null;
          created_at: string;
          duration_seconds: number | null;
          bitrate: number | null;
          sample_rate: number | null;
          metadata_status: string | null;
          metadata_review_required: boolean;
          file_hash: string | null;
          id: string;
          library_id: string;
          original_filename: string;
          source_folder: string | null;
          title: string;
        };
        Insert: {
          album?: string | null;
          artist?: string | null;
          audio_path: string;
          cover_path?: string | null;
          created_at?: string;
          duration_seconds?: number | null;
          bitrate?: number | null;
          sample_rate?: number | null;
          metadata_status?: string | null;
          metadata_review_required?: boolean;
          file_hash?: string | null;
          id?: string;
          library_id: string;
          original_filename: string;
          source_folder?: string | null;
          title: string;
        };
        Update: {
          album?: string | null;
          artist?: string | null;
          audio_path?: string;
          cover_path?: string | null;
          created_at?: string;
          duration_seconds?: number | null;
          bitrate?: number | null;
          sample_rate?: number | null;
          metadata_status?: string | null;
          metadata_review_required?: boolean;
          file_hash?: string | null;
          id?: string;
          library_id?: string;
          original_filename?: string;
          source_folder?: string | null;
          title?: string;
        };
        Relationships: [
          {
            foreignKeyName: "songs_library_id_fkey";
            columns: ["library_id"];
            isOneToOne: false;
            referencedRelation: "libraries";
            referencedColumns: ["id"];
          },
        ];
      };
      ratings: {
        Row: {
          created_at: string;
          id: string;
          rating: string;
          song_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          rating: string;
          song_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          rating?: string;
          song_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "ratings_song_id_fkey";
            columns: ["song_id"];
            isOneToOne: true;
            referencedRelation: "songs";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<never, never>;
    Functions: Record<never, never>;
    Enums: Record<never, never>;
    CompositeTypes: Record<never, never>;
  };
};

export type SongRow = Database["public"]["Tables"]["songs"]["Row"];
export type RatingRow = Database["public"]["Tables"]["ratings"]["Row"];
export type LibraryRow = Database["public"]["Tables"]["libraries"]["Row"];
