import {
  Award, Monitor, Users, FlaskConical, Sparkles, Scale, Languages, Handshake, Globe2, Heart, BookOpen, Atom, Cpu, Trophy,
  CircleDot, Library, BedDouble, Bus, GraduationCap,
} from 'lucide-react';

const MAP = {
  award: Award, monitor: Monitor, users: Users, flask: FlaskConical, sparkles: Sparkles, scale: Scale, languages: Languages,
  handshake: Handshake, globe: Globe2, heart: Heart, book: BookOpen, atom: Atom, cpu: Cpu, trophy: Trophy, dribbble: CircleDot,
  library: Library, bed: BedDouble, bus: Bus,
};

export default function Icon({ name, ...props }) {
  const C = MAP[name] || GraduationCap;
  return <C {...props} />;
}
