export type AvatarIcon = "sparkles" | "book" | "bolt" | "leaf";
export type AvatarColor = "blue" | "violet" | "coral" | "green";

export interface LocalProfilePreferences {
  avatarIcon: AvatarIcon;
  avatarColor: AvatarColor;
  interests: string[];
}
