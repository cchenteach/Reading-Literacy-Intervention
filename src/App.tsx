import React, { useState, useEffect } from 'react';
import { 
  BookOpen, 
  Moon, 
  Sun, 
  Share2, 
  Play, 
  Layout, 
  FileText, 
  Image as ImageIcon, 
  SpellCheck, 
  GraduationCap, 
  CheckCircle2, 
  PenTool, 
  Plus, 
  Bot,
  ChevronDown,
  MessageSquare,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  List,
  Palette,
  Pencil,
  MessageSquarePlus,
  Eye,
  Check,
  Download,
  Loader2,
  Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI, Type } from "@google/genai";
import * as XLSX from 'xlsx';

// --- Types ---

interface StudentEntry {
  type: 'Simple' | 'Compound' | 'Complex';
  entry: string;
  aiFeedback: string;
  aiFeedbackType: 'complete' | 'warning' | 'perfect' | 'strong' | 'bot' | 'suggestion';
  teacherFeedback: string;
}

interface Student {
  id: string;
  initials: string;
  name: string;
  color: string;
  entries: StudentEntry[];
  finalSynthesis: string;
  furtherCorrections: string;
}

interface VocabularyItem {
  word: string;
  pos: string;
  definition: string;
}

// --- Mock Data ---

const TEXT_STRUCTURE_DATA: Record<string, { focus: string; reading: string[]; writing: string[] }> = {
  "Description": {
    focus: "Identifying characteristics and sensory details within a descriptive framework.",
    reading: [
      "Identify topic and key details",
      "Recognize descriptive language and domain vocabulary",
      "Determine central idea",
      "Use headings and text features"
    ],
    writing: [
      "Develop a clear topic sentence",
      "Group related details logically",
      "Use precise vocabulary",
      "Incorporate definitions and examples"
    ]
  },
  "Chronological/Sequence": {
    focus: "Understanding the order of events and the relationships between them.",
    reading: [
      "Identify sequence of events or steps",
      "Recognize signal words (first, next, finally)",
      "Summarize processes",
      "Analyze how sequence supports understanding"
    ],
    writing: [
      "Organize ideas in logical order",
      "Use transition words",
      "Maintain clarity in procedural steps",
      "Ensure coherence across stages"
    ]
  },
  "Cause and Effect": {
    focus: "Analyzing how one event or action leads to another.",
    reading: [
      "Identify cause/effect relationships",
      "Distinguish direct vs. indirect effects",
      "Analyze logical connections",
      "Evaluate strength of causal claims"
    ],
    writing: [
      "Clearly explain causal relationships",
      "Use precise signal phrases (as a result, therefore)",
      "Support claims with evidence",
      "Avoid faulty reasoning"
    ]
  },
  "Compare and Contrast": {
    focus: "Examining similarities and differences between two or more subjects.",
    reading: [
      "Identify similarities and differences",
      "Recognize comparison structures (block vs. point-by-point)",
      "Analyze significance of comparisons",
      "Synthesize across sections"
    ],
    writing: [
      "Choose appropriate organizational structure",
      "Use comparison transitions (however, similarly)",
      "Maintain balanced analysis",
      "Develop a meaningful conclusion"
    ]
  },
  "Problem and Solution": {
    focus: "Identifying a challenge and evaluating potential ways to address it.",
    reading: [
      "Identify stated or implied problems",
      "Evaluate proposed solutions",
      "Analyze feasibility and evidence",
      "Determine author's purpose"
    ],
    writing: [
      "Clearly define the problem",
      "Propose logical solutions",
      "Support with reasons and evidence",
      "Address counterarguments (upper grades)"
    ]
  },
  "Argument/Persuasion": {
    focus: "Evaluating claims, evidence, and reasoning to form a judgment.",
    reading: [
      "Identify claims and counterclaims",
      "Evaluate evidence and reasoning",
      "Detect bias and rhetorical strategies",
      "Analyze tone and credibility"
    ],
    writing: [
      "Detect bias and rhetorical strategies",
      "Analyze tone and credibility",
      "Craft a defensible thesis",
      "Integrate relevant evidence",
      "Develop logical reasoning",
      "Address counterclaims",
      "Use formal academic tone"
    ]
  }
};

const INITIAL_STUDENTS: Student[] = Array.from({ length: 25 }, (_, i) => ({
  id: (i + 1).toString(),
  initials: (i + 1).toString(),
  name: '',
  color: [
    'bg-blue-100 text-blue-600',
    'bg-purple-100 text-purple-600',
    'bg-emerald-100 text-emerald-600',
    'bg-amber-100 text-amber-600',
    'bg-rose-100 text-rose-600',
    'bg-indigo-100 text-indigo-600',
    'bg-orange-100 text-orange-600',
    'bg-teal-100 text-teal-600'
  ][i % 8],
  entries: [
    { type: 'Simple', entry: '', aiFeedback: '', aiFeedbackType: 'bot', teacherFeedback: '' },
    { type: 'Compound', entry: '', aiFeedback: '', aiFeedbackType: 'bot', teacherFeedback: '' },
    { type: 'Complex', entry: '', aiFeedback: '', aiFeedbackType: 'bot', teacherFeedback: '' },
  ],
  finalSynthesis: '',
  furtherCorrections: ''
}));

// --- Components ---

const FeedbackBadge = ({ type, text }: { type: StudentEntry['aiFeedbackType'], text: string }) => {
  switch (type) {
    case 'complete':
      return <span className="text-[10px] font-bold uppercase tracking-wider text-green-600 bg-green-50 dark:bg-green-900/20 rounded px-2 py-1">{text}</span>;
    case 'warning':
      return <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 bg-amber-50 dark:bg-amber-900/20 rounded px-2 py-1">{text}</span>;
    case 'perfect':
      return <span className="text-[10px] font-bold uppercase tracking-wider text-green-600 bg-green-50 dark:bg-green-900/20 rounded px-2 py-1">{text}</span>;
    case 'strong':
      return <span className="text-[10px] font-bold uppercase tracking-wider text-green-600 bg-green-50 dark:bg-green-900/20 rounded px-2 py-1">{text}</span>;
    case 'bot':
      return <Bot className="w-4 h-4 text-slate-300 dark:text-slate-600" />;
    default:
      return null;
  }
};

const RichTextarea = ({ value, defaultValue, onChange, placeholder, className, rows = 3, showModeSelector = false }: any) => {
  const editorRef = React.useRef<HTMLDivElement>(null);
  const [internalValue, setInternalValue] = useState(value || defaultValue || "");
  const [mode, setMode] = useState<'editing' | 'suggesting' | 'viewing'>('editing');
  const [showModeMenu, setShowModeMenu] = useState(false);
  const [showColors, setShowColors] = useState(false);

  const colors = [
    { name: 'Red', value: '#ef4444' },
    { name: 'Blue', value: '#3b82f6' },
    { name: 'Green', value: '#22c55e' },
    { name: 'Orange', value: '#f97316' },
    { name: 'Purple', value: '#a855f7' },
    { name: 'Black', value: '#000000' },
  ];

  useEffect(() => {
    if (editorRef.current && internalValue !== editorRef.current.innerHTML) {
      editorRef.current.innerHTML = internalValue;
    }
  }, []);

  useEffect(() => {
    if (value !== undefined && value !== internalValue) {
      setInternalValue(value);
      if (editorRef.current && editorRef.current.innerHTML !== value) {
        editorRef.current.innerHTML = value;
      }
    }
  }, [value]);

  const handleInput = (e: React.FormEvent<HTMLDivElement>) => {
    const html = e.currentTarget.innerHTML;
    setInternalValue(html);
    if (onChange) {
      onChange({ target: { value: html } } as any);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (mode === 'viewing') {
      e.preventDefault();
      return;
    }

    if (mode === 'suggesting') {
      const selection = window.getSelection();
      if (!selection) return;

      if (e.key === 'Backspace' || e.key === 'Delete') {
        if (!selection.isCollapsed) {
          e.preventDefault();
          const range = selection.getRangeAt(0);
          const span = document.createElement('span');
          span.className = 'suggestion-remove';
          span.appendChild(range.extractContents());
          range.insertNode(span);
          range.collapse(false);
          handleInput({ currentTarget: editorRef.current } as any);
        }
        // Allow normal backspace for single characters
      } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        const range = selection.getRangeAt(0);
        range.deleteContents();

        const span = document.createElement('span');
        span.className = 'suggestion-add';
        span.textContent = e.key;
        
        range.insertNode(span);

        // Move cursor after the new span
        const newRange = document.createRange();
        newRange.setStartAfter(span);
        newRange.collapse(true);
        selection.removeAllRanges();
        selection.addRange(newRange);
        
        handleInput({ currentTarget: editorRef.current } as any);
      }
    }
  };

  const applyFormat = (command: string, value: string = '') => {
    if (mode === 'viewing') return;
    document.execCommand(command, false, value);
    if (editorRef.current) {
      handleInput({ currentTarget: editorRef.current } as any);
    }
  };

  const applyColor = (color: string) => {
    applyFormat('foreColor', color);
    setShowColors(false);
  };

  const modes = [
    { id: 'editing', label: 'Editing', desc: 'Edit document directly', icon: Pencil },
    { id: 'suggesting', label: 'Suggesting', desc: 'Edits become suggestions', icon: MessageSquarePlus },
    { id: 'viewing', label: 'Viewing', desc: 'Read or print final document', icon: Eye },
  ];

  const CurrentModeIcon = modes.find(m => m.id === mode)?.icon || Pencil;

  return (
    <div className={`flex flex-col border border-slate-200 dark:border-slate-700 rounded-xl focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary transition-all bg-white ${showModeMenu ? 'z-[100] relative overflow-visible' : 'z-10 relative'}`}>
      <div className="flex items-center justify-between p-1 bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 relative rounded-t-xl">
        <div className="flex items-center gap-0.5">
          <button 
            type="button"
            onClick={() => applyFormat('bold')}
            disabled={mode === 'viewing'}
            className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors text-slate-700 dark:text-slate-300 disabled:opacity-30"
            title="Bold"
          >
            <Bold className="w-3.5 h-3.5" />
          </button>
          <button 
            type="button"
            onClick={() => applyFormat('italic')}
            disabled={mode === 'viewing'}
            className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors text-slate-700 dark:text-slate-300 disabled:opacity-30"
            title="Italic"
          >
            <Italic className="w-3.5 h-3.5" />
          </button>
          <button 
            type="button"
            onClick={() => applyFormat('underline')}
            disabled={mode === 'viewing'}
            className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors text-slate-700 dark:text-slate-300 disabled:opacity-30"
            title="Underline"
          >
            <Underline className="w-3.5 h-3.5" />
          </button>
          <button 
            type="button"
            onClick={() => applyFormat('strikeThrough')}
            disabled={mode === 'viewing'}
            className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors text-slate-700 dark:text-slate-300 disabled:opacity-30"
            title="Strikethrough"
          >
            <Strikethrough className="w-3.5 h-3.5" />
          </button>
          <div className="w-px h-4 bg-slate-300 dark:bg-slate-700 mx-1" />
          <button 
            type="button"
            onClick={() => applyFormat('insertUnorderedList')}
            disabled={mode === 'viewing'}
            className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors text-slate-700 dark:text-slate-300 disabled:opacity-30"
            title="List"
          >
            <List className="w-3.5 h-3.5" />
          </button>
          <div className="w-px h-4 bg-slate-300 dark:bg-slate-700 mx-1" />
          <div className="relative">
            <button 
              type="button"
              onClick={() => setShowColors(!showColors)}
              disabled={mode === 'viewing'}
              className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors text-slate-700 dark:text-slate-300 disabled:opacity-30"
              title="Text Color"
            >
              <Palette className="w-3.5 h-3.5" />
            </button>
            {showColors && (
              <div className="absolute top-full left-0 mt-1 p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl z-50 flex gap-1.5">
                {colors.map(c => (
                  <button
                    key={c.name}
                    type="button"
                    onClick={() => applyColor(c.value)}
                    className="w-5 h-5 rounded-full border border-slate-200 dark:border-slate-600 hover:scale-110 transition-transform"
                    style={{ backgroundColor: c.value }}
                    title={c.name}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {showModeSelector && (
          <div className="relative">
            <button 
              type="button"
              onClick={() => setShowModeMenu(!showModeMenu)}
              className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg transition-all text-[11px] font-bold uppercase tracking-wider border border-primary/20 shadow-sm"
            >
              <CurrentModeIcon className="w-3.5 h-3.5" />
              <span>{mode}</span>
              <ChevronDown className={`w-3 h-3 transition-transform ${showModeMenu ? 'rotate-180' : ''}`} />
            </button>
            
            <AnimatePresence>
              {showModeMenu && (
                <>
                  <div className="fixed inset-0 z-[105] bg-transparent" onClick={() => setShowModeMenu(false)} />
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 10 }}
                    className="absolute top-0 right-0 w-72 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl z-[110] overflow-hidden"
                  >
                  <div className="p-4 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-700">
                    <h5 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-widest">Select Mode</h5>
                    <p className="text-[10px] text-slate-500 mt-1">Choose how you want to interact with the text.</p>
                  </div>
                  <div className="p-2 space-y-1">
                    {modes.map(m => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => {
                          setMode(m.id as any);
                          setShowModeMenu(false);
                        }}
                        className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all text-left ${mode === m.id ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400'}`}
                      >
                        <div className={`p-2 rounded-lg ${mode === m.id ? 'bg-white/20' : 'bg-slate-100 dark:bg-slate-800'}`}>
                          <m.icon className="w-4 h-4" />
                        </div>
                        <div className="flex-1">
                          <div className="text-xs font-bold">{m.label}</div>
                          <div className={`text-[10px] ${mode === m.id ? 'text-white/70' : 'text-slate-400'}`}>{m.desc}</div>
                        </div>
                        {mode === m.id && <Check className="w-4 h-4" />}
                      </button>
                    ))}
                  </div>
                </motion.div>
              </>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
      <div
        ref={editorRef}
        contentEditable={mode !== 'viewing'}
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        data-placeholder={placeholder}
        className={`w-full bg-white dark:bg-slate-900 min-h-[4rem] p-3 text-sm outline-none font-medium text-slate-900 dark:text-slate-100 rounded-b-xl overflow-y-auto ${mode === 'viewing' ? 'cursor-default' : ''} ${className}`}
        style={{ height: rows ? `${rows * 1.5}rem` : 'auto' }}
      />
    </div>
  );
};

export default function App() {
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem('literacy-intervention-dark');
    return saved ? JSON.parse(saved) : false;
  });
  const [students, setStudents] = useState<Student[]>(() => {
    const saved = localStorage.getItem('literacy-intervention-students');
    return saved ? JSON.parse(saved) : INITIAL_STUDENTS;
  });
  const [selectedStructure, setSelectedStructure] = useState<string>(() => {
    return localStorage.getItem('literacy-intervention-structure') || "Description";
  });
  const [checkedSkills, setCheckedSkills] = useState<Set<string>>(() => {
    const saved = localStorage.getItem('literacy-intervention-skills');
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });
  const [customTopic, setCustomTopic] = useState<string>(() => {
    return localStorage.getItem('literacy-intervention-topic') || "";
  });
  const [teacherDemo, setTeacherDemo] = useState<string>(() => {
    return localStorage.getItem('literacy-intervention-teacher-demo') || "";
  });
  const [demoSimple, setDemoSimple] = useState('The sun set quickly.');
  const [demoCompound, setDemoCompound] = useState('The sun set, and the sky turned pink.');
  const [demoComplex, setDemoComplex] = useState('After the sun set, the sky turned pink.');
  const [demoCompoundComplex, setDemoCompoundComplex] = useState('After the sun set, the sky turned pink and stars appeared.');

  // AI Tools State
  const [generatedText, setGeneratedText] = useState<string>(() => {
    return localStorage.getItem('literacy-intervention-gen-text') || "";
  });
  const [generatedImage, setGeneratedImage] = useState<string>(() => {
    return localStorage.getItem('literacy-intervention-gen-image') || "";
  });
  const [generatedVideo, setGeneratedVideo] = useState<string>(() => {
    return localStorage.getItem('literacy-intervention-gen-video') || "";
  });
  const [vocabulary, setVocabulary] = useState<VocabularyItem[]>(() => {
    const saved = localStorage.getItem('literacy-intervention-vocab');
    return saved ? JSON.parse(saved) : [];
  });
  const [showResults, setShowResults] = useState(() => {
    const saved = localStorage.getItem('literacy-intervention-show-results');
    return saved ? JSON.parse(saved) : false;
  });

  const [isGeneratingText, setIsGeneratingText] = useState(false);
  const [isGeneratingMedia, setIsGeneratingMedia] = useState(false);
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
  const [isProvidingFeedback, setIsProvidingFeedback] = useState<string | null>(null);
  const [isExtractingWords, setIsExtractingWords] = useState(false);

  useEffect(() => {
    localStorage.setItem('literacy-intervention-dark', JSON.stringify(isDark));
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  useEffect(() => {
    localStorage.setItem('literacy-intervention-students', JSON.stringify(students));
  }, [students]);

  useEffect(() => {
    localStorage.setItem('literacy-intervention-structure', selectedStructure);
  }, [selectedStructure]);

  useEffect(() => {
    localStorage.setItem('literacy-intervention-skills', JSON.stringify(Array.from(checkedSkills)));
  }, [checkedSkills]);

  useEffect(() => {
    localStorage.setItem('literacy-intervention-topic', customTopic);
  }, [customTopic]);

  useEffect(() => {
    localStorage.setItem('literacy-intervention-teacher-demo', teacherDemo);
  }, [teacherDemo]);

  useEffect(() => {
    localStorage.setItem('literacy-intervention-gen-text', generatedText);
  }, [generatedText]);

  useEffect(() => {
    localStorage.setItem('literacy-intervention-gen-image', generatedImage);
  }, [generatedImage]);

  useEffect(() => {
    localStorage.setItem('literacy-intervention-gen-video', generatedVideo);
  }, [generatedVideo]);

  useEffect(() => {
    localStorage.setItem('literacy-intervention-vocab', JSON.stringify(vocabulary));
  }, [vocabulary]);

  useEffect(() => {
    localStorage.setItem('literacy-intervention-show-results', JSON.stringify(showResults));
  }, [showResults]);

  const toggleDarkMode = () => setIsDark(!isDark);

  const handleAddRow = () => {
    const newId = Date.now().toString();
    const colors = [
      'bg-blue-100 text-blue-600',
      'bg-purple-100 text-purple-600',
      'bg-emerald-100 text-emerald-600',
      'bg-amber-100 text-amber-600',
      'bg-rose-100 text-rose-600',
      'bg-indigo-100 text-indigo-600',
      'bg-orange-100 text-orange-600',
      'bg-teal-100 text-teal-600'
    ];
    
    const newStudent: Student = {
      id: newId,
      initials: (students.length + 1).toString(),
      name: '',
      color: colors[students.length % colors.length],
      entries: [
        { type: 'Simple', entry: '', aiFeedback: '', aiFeedbackType: 'bot', teacherFeedback: '' },
        { type: 'Compound', entry: '', aiFeedback: '', aiFeedbackType: 'bot', teacherFeedback: '' },
        { type: 'Complex', entry: '', aiFeedback: '', aiFeedbackType: 'bot', teacherFeedback: '' },
      ],
      finalSynthesis: '',
      furtherCorrections: ''
    };
    
    setStudents([...students, newStudent]);
  };

  const updateStudent = (id: string, updates: Partial<Student>) => {
    setStudents(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
  };

  const updateStudentEntry = (studentId: string, entryIdx: number, updates: Partial<StudentEntry>) => {
    setStudents(prev => prev.map(s => {
      if (s.id === studentId) {
        const newEntries = [...s.entries];
        newEntries[entryIdx] = { ...newEntries[entryIdx], ...updates };
        return { ...s, entries: newEntries };
      }
      return s;
    }));
  };

  const stripHtml = (html: string) => {
    const tmp = document.createElement("DIV");
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || "";
  };

  const handleProvideAIFeedback = async (studentId: string, entryIndex: number) => {
    const student = students.find(s => s.id === studentId);
    if (!student) return;

    const entry = student.entries[entryIndex];
    if (!entry || !entry.entry) {
      alert("Please enter a sentence first.");
      return;
    }

    setIsProvidingFeedback(`${studentId}-${entryIndex}`);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `You are an expert literacy teacher. Provide constructive, concise feedback on this sentence written by a student. The sentence is: "${entry.entry}". Focus on grammar, syntax, and clarity. Return feedback in simple HTML, using <span class="suggestion-remove"> for deletions and <span class="suggestion-add"> for additions. For example: "<span class="suggestion-remove">He go</span> <span class="suggestion-add">He goes</span> to the park." Keep the feedback to a single sentence.`,
      });

      const feedback = response.text.trim();
      updateStudentEntry(studentId, entryIndex, { aiFeedback: feedback, aiFeedbackType: 'suggestion' });

    } catch (error) {
      console.error("Error providing AI feedback:", error);
      alert("An error occurred while generating feedback.");
    } finally {
      setIsProvidingFeedback(null);
    }
  };

  const exportToExcel = () => {
    // 1. Student Portfolio Sheet
    const studentData = students.flatMap(student => 
      student.entries.map(entry => ({
        'Student Name': student.name || `Student ${student.initials}`,
        'Sentence Type': entry.type,
        'Student Entry': stripHtml(entry.entry),
        'AI Feedback': stripHtml(entry.aiFeedback),
        'Teacher Feedback': stripHtml(entry.teacherFeedback),
        'Final Synthesis': entry.type === 'Simple' ? stripHtml(student.finalSynthesis) : '',
        'Synthesis Corrections': entry.type === 'Simple' ? stripHtml(student.furtherCorrections) : ''
      }))
    );

    // 2. Lesson Overview Sheet
    const selectedReadingSkills = TEXT_STRUCTURE_DATA[selectedStructure]?.reading
      .filter((_, i) => checkedSkills.has(`reading-${selectedStructure}-${i}`))
      .join('; ') || 'None selected';
      
    const selectedWritingSkills = TEXT_STRUCTURE_DATA[selectedStructure]?.writing
      .filter((_, i) => checkedSkills.has(`writing-${selectedStructure}-${i}`))
      .join('; ') || 'None selected';

    const lessonOverview = [
      { 'Category': 'Text Structure', 'Details': selectedStructure },
      { 'Category': 'Reading Focus', 'Details': TEXT_STRUCTURE_DATA[selectedStructure]?.focus || '' },
      { 'Category': 'Selected Reading Skills', 'Details': selectedReadingSkills },
      { 'Category': 'Selected Writing Skills', 'Details': selectedWritingSkills },
      { 'Category': 'Teacher Demonstration', 'Details': stripHtml(teacherDemo) },
      { 'Category': 'Generated Passage', 'Details': stripHtml(generatedText) },
      { 'Category': 'Generated Image', 'Details': generatedImage ? 'Image data present in app' : 'No image generated' }
    ];

    // 3. Vocabulary Sheet
    const vocabData = vocabulary.map(v => ({
      'Word': v.word,
      'Part of Speech': v.pos,
      'Definition': v.definition
    }));

    const wb = XLSX.utils.book_new();
    
    const wsPortfolio = XLSX.utils.json_to_sheet(studentData);
    XLSX.utils.book_append_sheet(wb, wsPortfolio, "Student Portfolio");
    
    const wsOverview = XLSX.utils.json_to_sheet(lessonOverview);
    XLSX.utils.book_append_sheet(wb, wsOverview, "Lesson Overview");
    
    if (vocabData.length > 0) {
      const wsVocab = XLSX.utils.json_to_sheet(vocabData);
      XLSX.utils.book_append_sheet(wb, wsVocab, "Vocabulary");
    }

    XLSX.writeFile(wb, `Literacy_Intervention_Full_Export_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const toggleSkill = (skill: string) => {
    const newChecked = new Set(checkedSkills);
    if (newChecked.has(skill)) {
      newChecked.delete(skill);
    } else {
      newChecked.add(skill);
    }
    setCheckedSkills(newChecked);
  };

  const currentData = TEXT_STRUCTURE_DATA[selectedStructure] || TEXT_STRUCTURE_DATA["Description"];

  const handleGenerateText = async () => {
    setIsGeneratingText(true);
    setShowResults(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
      const skills = Array.from(checkedSkills as Set<string>).map(s => s.split('-').pop()).join(', ');
      const topicContext = customTopic ? `The topic should be: "${customTopic}".` : "Choose an appropriate educational topic.";
      const prompt = `Generate a short reading passage (about 200 words) for a middle school student. 
      ${topicContext}
      The text structure should be "${selectedStructure}". 
      Focus on: ${currentData.focus}. 
      Incorporate elements that help students practice these skills: ${skills}.
      Make the content engaging and educational.`;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
      });
      setGeneratedText(response.text || "Failed to generate text.");
    } catch (error) {
      console.error("Error generating text:", error);
      setGeneratedText("Error generating text. Please try again.");
    } finally {
      setIsGeneratingText(false);
    }
  };

  const handleGenerateMedia = async () => {
    if (!generatedText) {
      alert("Please generate a reading passage first.");
      return;
    }
    setIsGeneratingMedia(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
      const prompt = `Create a high-quality educational illustration for a reading passage about: ${generatedText.substring(0, 500)}. 
      Style: Clean, professional, educational illustration, vibrant colors.`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [{ text: prompt }] },
      });

      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          setGeneratedImage(`data:image/png;base64,${part.inlineData.data}`);
          break;
        }
      }
    } catch (error) {
      console.error("Error generating media:", error);
    } finally {
      setIsGeneratingMedia(false);
    }
  };

  const handleExtractWords = async () => {
    if (!generatedText) {
      alert("Please generate a reading passage first.");
      return;
    }
    setIsExtractingWords(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Extract exactly 15 key academic vocabulary words from this text: "${generatedText}". 
        For each word, provide its part of speech (pos) and a simple, student-friendly definition.
        Return them as a JSON array of objects.`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: { 
              type: Type.OBJECT,
              properties: {
                word: { type: Type.STRING },
                pos: { type: Type.STRING, description: "Part of speech (e.g., noun, verb, adjective)" },
                definition: { type: Type.STRING, description: "A simple, student-friendly definition" }
              },
              required: ["word", "pos", "definition"]
            }
          }
        }
      });
      const words = JSON.parse(response.text || "[]");
      setVocabulary(words);
    } catch (error) {
      console.error("Error extracting words:", error);
    } finally {
      setIsExtractingWords(false);
    }
  };

  const handleGenerateVideo = async () => {
    if (!generatedText) {
      alert("Please generate a reading passage first.");
      return;
    }

    // @ts-ignore
    const hasKey = await window.aistudio.hasSelectedApiKey();
    if (!hasKey) {
      // @ts-ignore
      await window.aistudio.openSelectKey();
      return;
    }

    setIsGeneratingVideo(true);
    setShowResults(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
      let operation = await ai.models.generateVideos({
        model: 'veo-3.1-fast-generate-preview',
        prompt: `A high-quality educational animation for a reading passage about: ${generatedText.substring(0, 300)}. Style: 3D animation, bright, clear, educational.`,
        config: {
          numberOfVideos: 1,
          resolution: '720p',
          aspectRatio: '16:9'
        }
      });

      while (!operation.done) {
        await new Promise(resolve => setTimeout(resolve, 10000));
        operation = await ai.operations.getVideosOperation({operation: operation});
      }

      const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
      if (downloadLink) {
        const response = await fetch(downloadLink, {
          method: 'GET',
          headers: {
            'x-goog-api-key': process.env.API_KEY!,
          },
        });
        const blob = await response.blob();
        setGeneratedVideo(URL.createObjectURL(blob));
      }
    } catch (error: any) {
      console.error("Error generating video:", error);
      if (error.message?.includes("Requested entity was not found")) {
        // @ts-ignore
        await window.aistudio.openSelectKey();
      }
    } finally {
      setIsGeneratingVideo(false);
    }
  };

  return (
    <div className="min-h-screen font-sans selection:bg-primary/30">
      {/* Navigation */}
      <nav className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-20 items-center">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center text-white">
                <BookOpen className="w-6 h-6" />
              </div>
              <div className="flex flex-col leading-tight">
                <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                  Reading <span className="text-primary">Literacy Intervention</span>
                </span>
                <span className="text-[10px] md:text-xs font-medium text-slate-500 dark:text-slate-400 tracking-wide uppercase">
                  BRIDGING THE READING LITERACY GAP LEVERAGING AI
                </span>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <button 
                onClick={toggleDarkMode}
                className="p-2.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-600 dark:text-slate-400"
              >
                {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <header className="mb-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <nav className="flex items-center text-sm text-slate-500 dark:text-slate-400 mb-3">
                <span>Activities</span>
                <span className="mx-2 opacity-50">/</span>
                <span className="text-primary font-semibold">Sentence Variation Writing</span>
              </nav>
              <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-slate-500 dark:text-slate-400">
                Sentence Variation Lesson Overview
              </h1>
              <p className="text-slate-600 dark:text-slate-400 mt-2 text-lg">
                Mastering sentence complexity and textual structure through AI-assisted learning.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button className="flex items-center gap-2 px-5 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:shadow-md transition-all text-sm font-bold text-slate-700 dark:text-slate-200">
                <Share2 className="w-4 h-4" /> Share
              </button>
            </div>
          </div>
        </header>

        {/* Top Cards Grid */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
          {/* Text Structure */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col"
          >
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 flex items-center gap-2">
              <Layout className="w-5 h-5 text-primary" />
              <h3 className="font-bold text-primary uppercase tracking-wider text-sm">Text Structure</h3>
            </div>
            <div className="p-5 flex-1 space-y-4">
              <div className="space-y-2">
                {Object.keys(TEXT_STRUCTURE_DATA).map(key => (
                  <button
                    key={key}
                    onClick={() => setSelectedStructure(key)}
                    className={`w-full text-left px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                      selectedStructure === key 
                        ? 'bg-primary text-white shadow-md shadow-primary/20' 
                        : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                    }`}
                  >
                    {key}
                  </button>
                ))}
              </div>
              <div className="p-4 bg-indigo-50/50 dark:bg-primary/5 rounded-xl border border-dashed border-primary/30">
                <p className="text-[10px] text-primary/70 uppercase tracking-[0.2em] font-bold mb-2">Current Focus</p>
                <p className="text-sm leading-relaxed font-medium text-slate-700 dark:text-slate-300">
                  {currentData.focus}
                </p>
              </div>
            </div>
          </motion.div>

          {/* Reading Skill */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col"
          >
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-indigo-500" />
              <h3 className="font-bold text-indigo-500 uppercase tracking-wider text-sm">Reading Skill</h3>
            </div>
            <div className="p-5 flex-1 overflow-y-auto max-h-[280px] custom-scrollbar">
              <ul className="space-y-3">
                {currentData.reading.map((skill, i) => (
                  <li 
                    key={i} 
                    onClick={() => toggleSkill(`reading-${selectedStructure}-${i}`)}
                    className={`flex items-start gap-3 p-2.5 rounded-xl transition-all group cursor-pointer ${
                      checkedSkills.has(`reading-${selectedStructure}-${i}`)
                        ? 'bg-primary text-white shadow-md shadow-primary/20'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <div className={`w-5 h-5 rounded border flex items-center justify-center shrink-0 mt-0.5 transition-all ${
                      checkedSkills.has(`reading-${selectedStructure}-${i}`) 
                        ? 'bg-white border-white' 
                        : 'border-slate-300 dark:border-slate-600'
                    }`}>
                      {checkedSkills.has(`reading-${selectedStructure}-${i}`) && <CheckCircle2 className="w-3.5 h-3.5 text-primary" />}
                    </div>
                    <span className="text-sm font-medium">
                      {skill}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </motion.div>

          {/* Writing Skill */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col"
          >
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 flex items-center gap-2">
              <PenTool className="w-5 h-5 text-indigo-500" />
              <h3 className="font-bold text-indigo-500 uppercase tracking-wider text-sm">Writing Skill</h3>
            </div>
            <div className="p-5 flex-1 overflow-y-auto max-h-[280px] custom-scrollbar">
              <ul className="space-y-3">
                {currentData.writing.map((skill, i) => (
                  <li 
                    key={i} 
                    onClick={() => toggleSkill(`writing-${selectedStructure}-${i}`)}
                    className={`flex items-start gap-3 p-2.5 rounded-xl transition-all group cursor-pointer ${
                      checkedSkills.has(`writing-${selectedStructure}-${i}`)
                        ? 'bg-primary text-white shadow-md shadow-primary/20'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <div className={`w-5 h-5 rounded border flex items-center justify-center shrink-0 mt-0.5 transition-all ${
                      checkedSkills.has(`writing-${selectedStructure}-${i}`) 
                        ? 'bg-white border-white' 
                        : 'border-slate-300 dark:border-slate-600'
                    }`}>
                      {checkedSkills.has(`writing-${selectedStructure}-${i}`) && <PenTool className="w-3.5 h-3.5 text-primary" />}
                    </div>
                    <span className="text-sm font-semibold">
                      {skill}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </motion.div>
        </section>

        {/* AI Tools Dashboard */}
        <section className="mb-12">
          <h2 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
            <Bot className="w-4 h-4" /> AI Tools Dashboard
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { 
                title: "Reading Passage Generator", 
                desc: "Generate custom passages based on selected text structure.", 
                icon: FileText, 
                color: "text-blue-600", 
                bg: "bg-blue-50 dark:bg-blue-900/20", 
                btn: "Generate Text",
                loading: isGeneratingText,
                onClick: handleGenerateText
              },
              { 
                title: "Image/Video Generator", 
                desc: "Visual aids for comprehension based on reading passages.", 
                icon: ImageIcon, 
                color: "text-purple-600", 
                bg: "bg-purple-50 dark:bg-purple-900/20", 
                btn: "Generate Image",
                loading: isGeneratingMedia,
                onClick: handleGenerateMedia,
                secondaryBtn: "Generate Video",
                secondaryLoading: isGeneratingVideo,
                secondaryOnClick: handleGenerateVideo
              },
              { 
                title: "Academic Vocabulary", 
                desc: "Extract 15 key academic words from generated content.", 
                icon: SpellCheck, 
                color: "text-amber-600", 
                bg: "bg-amber-50 dark:bg-amber-900/20", 
                btn: "Extract Words",
                loading: isExtractingWords,
                onClick: handleExtractWords
              }
            ].map((tool, i) => (
              <motion.div 
                key={i}
                whileHover={{ y: -5 }}
                className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-xl transition-all group"
              >
                <div className={`h-12 w-12 ${tool.bg} rounded-xl flex items-center justify-center ${tool.color} mb-5 group-hover:scale-110 transition-transform`}>
                  <tool.icon className="w-6 h-6" />
                </div>
                <h4 className="font-bold text-slate-900 dark:text-white mb-2 text-lg">{tool.title}</h4>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-4 leading-relaxed">{tool.desc}</p>
                
                {i === 0 && (
                  <div className="mb-4">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">Custom Topic (Optional)</label>
                    <RichTextarea 
                      value={customTopic}
                      onChange={(e: any) => setCustomTopic(e.target.value)}
                      placeholder="e.g. Solar System, Ancient Rome, Photosynthesis..."
                      rows={2}
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <button 
                    onClick={tool.onClick}
                    disabled={tool.loading}
                    className="w-full py-2.5 bg-slate-800 text-white border border-slate-700 rounded-xl text-sm font-bold hover:bg-primary hover:border-primary transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {tool.loading ? (
                      <motion.div 
                        animate={{ rotate: 360 }}
                        transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                        className="w-4 h-4 border-2 border-current border-t-transparent rounded-full"
                      />
                    ) : tool.btn}
                  </button>

                  {/* @ts-ignore */}
                  {tool.secondaryBtn && (
                    <button 
                      // @ts-ignore
                      onClick={tool.secondaryOnClick}
                      // @ts-ignore
                      disabled={tool.secondaryLoading}
                      className="w-full py-2.5 bg-slate-800 text-white border border-slate-700 rounded-xl text-sm font-bold hover:bg-primary hover:border-primary transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {/* @ts-ignore */}
                      {tool.secondaryLoading ? (
                        <motion.div 
                          animate={{ rotate: 360 }}
                          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                          className="w-4 h-4 border-2 border-current border-t-transparent rounded-full"
                        />
                      ) : (
                        // @ts-ignore
                        tool.secondaryBtn
                      )}
                    </button>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* AI Results Section */}
        <AnimatePresence>
          {showResults && (
            <motion.section 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-12 space-y-6 overflow-hidden"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <Bot className="w-4 h-4" /> Generated Content
                </h2>
                <button 
                  onClick={() => setShowResults(false)}
                  className="text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  Close Results
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Generated Text */}
                <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
                  <h3 className="font-bold mb-4 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-primary" /> Reading Passage
                  </h3>
                  {isGeneratingText ? (
                    <div className="space-y-3">
                      <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded w-3/4 animate-pulse" />
                      <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded w-full animate-pulse" />
                      <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded w-5/6 animate-pulse" />
                      <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded w-2/3 animate-pulse" />
                    </div>
                  ) : (
                    <p className="text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                      {generatedText || "Generate a passage to see it here."}
                    </p>
                  )}
                </div>

                {/* Generated Media & Vocab */}
                <div className="space-y-6">
                  {/* Media */}
                  <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
                    <h3 className="font-bold mb-4 flex items-center gap-2">
                      <ImageIcon className="w-4 h-4 text-purple-600" /> Visual Aid
                    </h3>
                    <div className="space-y-4">
                      {isGeneratingMedia ? (
                        <div className="aspect-video bg-slate-100 dark:bg-slate-800 rounded-xl animate-pulse flex items-center justify-center">
                          <ImageIcon className="w-8 h-8 text-slate-300" />
                        </div>
                      ) : generatedImage ? (
                        <img 
                          src={generatedImage} 
                          alt="Generated visual aid" 
                          className="w-full rounded-xl shadow-sm"
                          referrerPolicy="no-referrer"
                        />
                      ) : null}

                      {isGeneratingVideo ? (
                        <div className="aspect-video bg-slate-100 dark:bg-slate-800 rounded-xl animate-pulse flex items-center justify-center flex-col gap-2">
                          <motion.div 
                            animate={{ rotate: 360 }}
                            transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                            className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full"
                          />
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Generating Video...</span>
                        </div>
                      ) : generatedVideo ? (
                        <video 
                          src={generatedVideo} 
                          controls 
                          className="w-full rounded-xl shadow-sm"
                        />
                      ) : null}

                      {!generatedImage && !generatedVideo && !isGeneratingMedia && !isGeneratingVideo && (
                        <div className="aspect-video bg-slate-50 dark:bg-slate-800/50 rounded-xl flex items-center justify-center text-slate-400 text-xs text-center p-4">
                          Generate media to see visual aids.
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Vocabulary */}
                  <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
                    <h3 className="font-bold mb-4 flex items-center gap-2">
                      <SpellCheck className="w-4 h-4 text-amber-600" /> Academic Vocabulary
                    </h3>
                    {isExtractingWords ? (
                      <div className="space-y-3">
                        {[...Array(5)].map((_, i) => (
                          <div key={i} className="space-y-2">
                            <div className="h-4 w-24 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />
                            <div className="h-3 w-full bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />
                          </div>
                        ))}
                      </div>
                    ) : vocabulary.length > 0 ? (
                      <div className="space-y-4 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
                        {vocabulary.map((item, i) => (
                          <div key={i} className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700/50">
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-bold text-slate-900 dark:text-white text-sm">{item.word}</span>
                              <span className="text-[10px] font-bold uppercase text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-1.5 py-0.5 rounded-md border border-amber-100 dark:border-amber-900/30">
                                {item.pos}
                              </span>
                            </div>
                            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                              {item.definition}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400">Extract words to see them here.</p>
                    )}
                  </div>
                </div>
              </div>
            </motion.section>
          )}
        </AnimatePresence>

        {/* Teacher Demonstration */}
        <section className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl shadow-slate-200/50 dark:shadow-none mb-12">
          <div className="bg-slate-900 text-white p-8 rounded-t-3xl">
            <h2 className="text-2xl font-bold flex items-center gap-3">
              <GraduationCap className="w-8 h-8 text-primary" /> TEACHER DEMONSTRATION
            </h2>
            <p className="text-slate-400 text-sm mt-2 font-medium">Modeling sentence variations for students.</p>
          </div>
          <div className="p-8">

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 shadow-sm">
                <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Coordinating Conjunctions (FANBOYS)</h5>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-3 italic">Connects two independent clauses.</p>
                <ul className="text-sm font-semibold text-slate-800 dark:text-slate-200 leading-relaxed space-y-1">
                  <li>For</li>
                  <li>And</li>
                  <li>Nor</li>
                  <li>But</li>
                  <li>Or</li>
                  <li>Yet</li>
                  <li>So</li>
                </ul>
              </div>
              <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 shadow-sm">
                <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Relative Pronouns</h5>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-3 italic">Introduces a clause that modifies a noun.</p>
                <ul className="text-sm font-semibold text-slate-800 dark:text-slate-200 leading-relaxed space-y-1">
                  <li>Who</li>
                  <li>Whom</li>
                  <li>Whose</li>
                  <li>Which</li>
                  <li>That</li>
                </ul>
              </div>
              <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 shadow-sm">
                <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Subordinating Conjunctions (SWABIAS)</h5>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-3 italic">Introduces a dependent clause.</p>
                <ul className="text-sm font-semibold text-slate-800 dark:text-slate-200 leading-relaxed space-y-1">
                  <li>Since</li>
                  <li>When</li>
                  <li>After</li>
                  <li>Because</li>
                  <li>If</li>
                  <li>As</li>
                  <li>Although</li>
                </ul>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Simple Sentence</label>
                <RichTextarea value={demoSimple} onChange={(e: any) => setDemoSimple(e.target.value)} rows={3} showModeSelector={true} />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Compound Sentence</label>
                <RichTextarea value={demoCompound} onChange={(e: any) => setDemoCompound(e.target.value)} rows={3} showModeSelector={true} />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Complex Sentence</label>
                <RichTextarea value={demoComplex} onChange={(e: any) => setDemoComplex(e.target.value)} rows={3} showModeSelector={true} />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Compound-Complex Sentence</label>
                <RichTextarea value={demoCompoundComplex} onChange={(e: any) => setDemoCompoundComplex(e.target.value)} rows={3} showModeSelector={true} />
              </div>
            </div>
          </div>
        </section>

        {/* Student Writing Portfolio */}
        <div className="w-full space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-2xl flex items-center gap-3 text-slate-900 dark:text-white">
              <PenTool className="w-6 h-6 text-primary" /> Student Writing Portfolio
            </h3>
            <button 
              onClick={handleAddRow}
              className="text-xs font-bold text-primary hover:underline flex items-center gap-1 bg-primary/5 px-3 py-1.5 rounded-full transition-colors"
            >
              <Plus className="w-3 h-3" /> ADD ROW
            </button>
          </div>
          
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl shadow-slate-200/30 dark:shadow-none overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[1200px]">
              <thead className="bg-slate-50 dark:bg-slate-800/50">
                <tr>
                  <th className="p-5 text-[11px] font-bold uppercase tracking-widest text-slate-500 w-[12%]">Student Name</th>
                  <th className="p-5 text-[11px] font-bold uppercase tracking-widest text-slate-500 w-[10%]">Sentence Type</th>
                  <th className="p-5 text-[11px] font-bold uppercase tracking-widest text-slate-500 w-[20%]">Student Entry</th>
                  <th className="p-5 text-[11px] font-bold uppercase tracking-widest text-slate-500 w-[10%]">AI Feedback</th>
                  <th className="p-5 text-[11px] font-bold uppercase tracking-widest text-slate-500 w-[23%]">Teacher Feedback</th>
                  <th className="p-5 text-[11px] font-bold uppercase tracking-widest text-slate-500 w-[25%]">Synthesis & Corrections</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {students.map((student) => (
                  <React.Fragment key={student.id}>
                    {student.entries.map((entry, idx) => (
                      <tr key={`${student.id}-${idx}`} className="group hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                        {idx === 0 && (
                          <td className="p-5 align-top border-r border-slate-100 dark:border-slate-800" rowSpan={3}>
                            <div className="flex flex-col items-start gap-2">
                              <div className={`w-9 h-9 rounded-full ${student.color} flex items-center justify-center text-xs font-bold shrink-0 shadow-sm`}>
                                {student.initials}
                              </div>
                              <input 
                                className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary px-3 py-2 text-sm font-bold text-slate-900 dark:text-white transition-all shadow-sm" 
                                type="text" 
                                value={student.name}
                                onChange={(e) => updateStudent(student.id, { name: e.target.value })}
                                placeholder="Name..."
                              />
                            </div>
                          </td>
                        )}
                        <td className="p-5 text-sm font-semibold text-slate-500 dark:text-slate-400">{entry.type}</td>
                        <td className="p-5">
                          <RichTextarea 
                            placeholder="Enter student sentence..." 
                            value={entry.entry}
                            onChange={(e: any) => updateStudentEntry(student.id, idx, { entry: e.target.value })}
                            rows={3}
                          />
                        </td>
                        <td className="p-5 space-y-2">
                          <FeedbackBadge type={entry.aiFeedbackType} text={entry.aiFeedback} />
                          <button 
                            onClick={() => handleProvideAIFeedback(student.id, idx)}
                            disabled={isProvidingFeedback === `${student.id}-${idx}`}
                            className="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-primary dark:hover:text-primary transition-colors disabled:opacity-50 disabled:pointer-events-none group"
                          >
                            {isProvidingFeedback === `${student.id}-${idx}` ? (
                              <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Generating...</>
                            ) : (
                              <><Sparkles className="w-3.5 h-3.5 text-slate-400 group-hover:text-amber-500 transition-colors" /> Provide AI Feedback</>
                            )}
                          </button>
                        </td>
                        <td className="p-5">
                          <div className="relative group/feedback">
                            <RichTextarea 
                              placeholder="Teacher feedback..."
                              value={entry.teacherFeedback}
                              onChange={(e: any) => updateStudentEntry(student.id, idx, { teacherFeedback: e.target.value })}
                              rows={2}
                              showModeSelector={true}
                            />
                            <MessageSquare className="absolute bottom-2 right-2 w-3 h-3 text-slate-300 opacity-0 group-hover/feedback:opacity-100 transition-opacity pointer-events-none" />
                          </div>
                        </td>
                        {idx === 0 && (
                          <td className="p-5 align-top border-l border-slate-100 dark:border-slate-800" rowSpan={3}>
                            <div className="flex flex-col h-full gap-5">
                              <div className="flex-1 flex flex-col">
                                <label className="text-[9px] font-bold uppercase text-slate-400 mb-2 tracking-widest">Final Synthesis</label>
                                <RichTextarea 
                                  placeholder="Synthesize your simple, compound, and complex ideas into a final compound-complex structure..."
                                  value={student.finalSynthesis}
                                  onChange={(e: any) => updateStudent(student.id, { finalSynthesis: e.target.value })}
                                  rows={4}
                                  showModeSelector={true}
                                />
                              </div>
                              <div className="flex-1 flex flex-col">
                                <label className="text-[9px] font-bold uppercase text-slate-400 mb-2 tracking-widest">Further Student Corrections</label>
                                <RichTextarea 
                                  placeholder="Enter any additional revisions or corrections here..."
                                  value={student.furtherCorrections}
                                  onChange={(e: any) => updateStudent(student.id, { furtherCorrections: e.target.value })}
                                  rows={4}
                                  showModeSelector={true}
                                />
                              </div>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Export Action */}
        <div className="mt-12 flex justify-center">
          <button 
            onClick={exportToExcel}
            className="flex items-center gap-2 px-8 py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold shadow-xl shadow-emerald-200 dark:shadow-none transition-all hover:scale-105 active:scale-95"
          >
            <Download className="w-5 h-5" />
            EXPORT PORTFOLIO TO EXCEL
          </button>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-20 border-t border-slate-200 dark:border-slate-800 py-12 bg-white dark:bg-slate-900">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <BookOpen className="w-5 h-5 text-primary" />
            <span className="font-bold text-slate-900 dark:text-white">Reading Literacy Intervention</span>
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">
            © 2024 Reading Literacy Intervention • Building reading-writing connections • AI-Enhanced Educational Dashboard
          </p>
        </div>
      </footer>
    </div>
  );
}
