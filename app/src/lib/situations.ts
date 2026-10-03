/**
 * Situation doors — "where are you today?" shortcuts that map a lived moment to
 * a theme. Same twelve doors, Tamil labels and theme ids as the shipped reader,
 * so a deep link like `#theme-anger` behaves identically in both apps.
 */
import {
  BookOpen,
  Coins,
  CloudRain,
  Eye,
  Flame,
  Heart,
  Home,
  MessageSquare,
  Shield,
  Sprout,
  Users,
  Waves,
  type LucideIcon,
} from 'lucide-react'

export interface Situation {
  id: string
  ta: string
  en: string
  theme: string
  icon: LucideIcon
}

export const SITUATIONS: readonly Situation[] = [
  { id: 'anger', ta: 'கோபம் வந்தபோது', en: "When I'm angry", theme: 'anger', icon: Flame },
  { id: 'patience', ta: 'பொறுமை தேவை', en: 'When I need patience', theme: 'patience', icon: Waves },
  { id: 'grief', ta: 'துன்பத்தில்', en: "When I'm grieving", theme: 'impermanence', icon: CloudRain },
  { id: 'fear', ta: 'பயம் வருகிறது', en: "When I'm afraid", theme: 'calm', icon: Shield },
  { id: 'starting', ta: 'புதிதாக தொடங்கும்போது', en: "When I'm starting something", theme: 'effort', icon: Sprout },
  { id: 'friends', ta: 'நட்பை நினைக்கும்போது', en: 'Thinking of friends', theme: 'friendship', icon: Users },
  { id: 'family', ta: 'குடும்பத்தில்', en: 'With family', theme: 'family', icon: Home },
  { id: 'wealth', ta: 'பொருள் தேடும்போது', en: 'About money & work', theme: 'wealth', icon: Coins },
  { id: 'words', ta: 'பேசும் முன்', en: 'Before I speak', theme: 'truth', icon: MessageSquare },
  { id: 'love', ta: 'காதலில்', en: 'In love', theme: 'love', icon: Heart },
  { id: 'learning', ta: 'கற்கும்போது', en: "When I'm learning", theme: 'learning', icon: BookOpen },
  { id: 'wisdom', ta: 'ஞானம் தேடி', en: 'Looking for wisdom', theme: 'wisdom', icon: Eye },
]
