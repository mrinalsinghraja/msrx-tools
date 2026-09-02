import type { ToolContent } from "@/lib/tools/types";

/**
 * SEO prose for the audio tools. Server-only.
 */
export const AUDIO_CONTENT: Record<string, ToolContent> = {

  "trim-audio": {
    intro: `Most recordings need their ends taken off. The interview starts with forty seconds of somebody finding the record button, the voice note has a lorry going past at the front, the song has a fade you want to lose. Cutting that away is the single most common thing anyone does to a sound file, and it should not require installing an editor.

Type a start time, type an end time, and what lies between them comes back as its own file. Times can be written as plain seconds or as minutes and seconds — 90 and 1:30 mean the same thing — because that is how people read them off a player.

Every cut is faded by twenty milliseconds at each end unless you turn that off. This is not a stylistic flourish. A waveform is a wiggling line, and a cut almost never lands where the line happens to be at zero; the jump from silence straight to mid-wiggle is heard as a click at the join. Twenty milliseconds is short enough that nobody perceives a fade and long enough that the click disappears.

The decoding is done by the browser itself, which means the formats it accepts are the formats it can play: MP3, WAV, M4A, OGG and usually FLAC. The trimming is arithmetic over the raw samples — copying a range out of an array — so nothing is re-rendered, and nothing beyond the encoding at the end is lost.

That last point is worth being precise about. Saving as WAV loses nothing at all. Saving as MP3 re-encodes, and re-encoding an MP3 that was already compressed costs a little quality, as it always does. For speech at a sensible bitrate this is inaudible; for music you are keeping, save the WAV.

Nothing is uploaded. A recording of a meeting, a medical consultation or a private conversation stays on your machine, which is where a recording of a private conversation belongs.`,
    steps: [
      "Drop in the recording.",
      "Type the start time and the end time. Leave either empty to run from the beginning or to the end.",
      "Choose MP3 for sending to someone, WAV if the clip is going into an editor next.",
      "Trim, then download.",
    ],
    faq: [
      {
        q: "How do I know where to cut?",
        a: "Play the file in whatever you normally use and read the times off its counter. Both boxes accept exactly what a player displays — 2:15 works, and so does 135.",
      },
      {
        q: "Why is there a fade on my cut?",
        a: "To stop a click. A cut through the middle of a waveform leaves an instant step from silence to a moving signal, and a step is a click. The fade is twenty milliseconds, which is a fiftieth of a second. Turn it off if you are cutting on an exact beat and want a hard edge.",
      },
      {
        q: "Can I cut a piece out of the middle instead?",
        a: "Not in one pass. Trim the part before it, trim the part after it, then put the two back together with the Audio Joiner. The joiner can also crossfade the seam if the cut is somewhere obvious.",
      },
      {
        q: "Does trimming reduce the quality?",
        a: "The cut itself does nothing to the samples it keeps. Encoding the result as MP3 compresses it again, which costs a little each time; choosing WAV avoids that entirely at the price of a much larger file.",
      },
    ],
  },

  "change-audio-volume": {
    intro: `There are two entirely different problems that both get described as "the volume is wrong", and they need different answers.

The first is that a recording is simply too quiet or too loud, and you know roughly by how much. That wants a straight change in gain: every sample multiplied by the same number. Six decibels up is roughly twice as loud, six down roughly half, and the relationship between the loud and quiet parts is untouched.

The second is that you have no idea by how much — you just want it to sound like everything else. That wants levelling to a target: the tool finds the loudest moment in the file, works out what would put that moment just below the maximum, and applies that. A voice note recorded at arm's length and a podcast recorded into a proper microphone end up at comparable levels without you guessing.

The ceiling matters, and this is where cheap tools do damage. Digital audio has a hard maximum. Push a sample past it and, written as an integer, it wraps around to a large negative number — a peak becomes a burst of noise, and a file made "louder" comes back ruined. Samples are clamped at the maximum here instead, so an over-enthusiastic setting flattens the loudest peaks rather than shattering them. When that starts happening the result panel says so, and points at the levelling mode, which cannot overshoot by construction.

The default target is one decibel below maximum. That is the convention: as loud as the format allows with a sliver of room left, so that a player's own processing has somewhere to go.

None of this is destructive to your original. The file on your disk is untouched; a new one is written. And nothing is uploaded — the arithmetic happens in this tab, on samples the browser decoded there.`,
    steps: [
      "Drop in one recording or a batch of them.",
      "Choose whether to change by a set amount or to match a target level.",
      "Set the amount, or the level the loudest point should reach.",
      "Run it, then listen to the result before you rely on it.",
    ],
    faq: [
      {
        q: "How many decibels should I add?",
        a: "Start with 6, which sounds like roughly double. If you cannot judge it, use the target-level mode instead — it measures your file and works out the number, which is more reliable than guessing twice.",
      },
      {
        q: "Why did adding more gain stop making it louder?",
        a: "Because the loudest moments have reached the maximum the format can hold. Beyond that the peaks are held flat rather than made bigger, which changes the shape of the sound without raising it. The result panel warns you when this is happening.",
      },
      {
        q: "Is this the same as compression or loudness normalisation?",
        a: "No. This scales everything by one factor, or scales it so the peak lands on a target. Broadcast loudness normalisation measures perceived loudness over time and squeezes the dynamic range, which is a different and much more invasive operation.",
      },
      {
        q: "Can I make a recording quieter?",
        a: "Yes — use a negative amount. Reducing gain is entirely safe: there is no floor to hit the way there is a ceiling above.",
      },
    ],
  },

  "change-audio-speed": {
    intro: `Playing something faster used to mean making everybody sound like a cartoon. Speed and pitch were welded together, because the only way to make a tape finish sooner was to pull it past the head faster, and that raised every frequency on it.

They come apart here, and that is the whole point of the tool: you change one without changing the other. Leave "keep the original pitch" on and a lecture at 1.5× finishes in two thirds of the time with the lecturer still sounding like themselves. Turn it off and you get the tape behaviour, which is genuinely what you want occasionally — for an effect, or to hear detail in something slowed right down.

The technique behind the first one is called WSOLA, and it is worth knowing what it does because it explains the limits. The recording is cut into short overlapping grains, and the grains are laid back down at a different spacing: closer together to speed up, further apart to slow down. Done naively this warbles horribly, because consecutive grains land out of phase with each other. WSOLA fixes it by sliding each grain a few milliseconds to wherever it best matches the waveform that would naturally have followed the previous one. That similarity search is the entire trick, and it is why a stretched voice still sounds like a voice.

It is not magic. Somewhere past about half speed or double speed the grains start to be audible on complex material — a full mix will develop a slight flutter that a single voice will not. Speech survives much further than music does, which is convenient, because speech is what most people are speeding up.

Everything runs in the browser on samples it decoded itself. A recording of a meeting you are trying to get through faster is not a recording you should be uploading to a stranger's server to achieve it.`,
    steps: [
      "Drop in the recording.",
      "Set the speed — 1.5× and 2× are the usual choices for talk, 0.5× for transcribing something difficult.",
      "Leave the pitch lock on for anything with a voice in it; turn it off for the tape effect.",
      "Run it and download.",
    ],
    faq: [
      {
        q: "Will a sped-up voice sound like a chipmunk?",
        a: "Not with the pitch lock on, which is the default. The speaker keeps their own pitch and simply talks faster. The chipmunk sound is what you get with it off, which is there because some people want exactly that.",
      },
      {
        q: "How fast can I go before it sounds bad?",
        a: "Speech holds up well to about 2×, and many people find 1.5× perfectly natural. Music is fussier — a full mix starts to flutter noticeably sooner, because there is more happening for the grain joins to disturb.",
      },
      {
        q: "Does slowing down add detail?",
        a: "No. It spreads the existing detail over more time, which genuinely helps when you are transcribing a mumbled sentence or learning a fast passage, but no information is created. What was not captured is still not there.",
      },
      {
        q: "Why is the result not exactly the length I calculated?",
        a: "The grains are laid down at whole-sample spacings, so the final length can land a fraction of a second either side of the arithmetic. The result panel shows the length it actually produced.",
      },
    ],
  },

  "change-audio-pitch": {
    intro: `Moving a recording to a different key without making it shorter or longer is a peculiar thing to ask a computer for, and it is worth understanding why, because it explains what the result will sound like.

Pitch and duration are naturally the same knob. Speed a recording up and everything in it rises; slow it down and everything falls. To change one without the other you have to do both and then undo half of it: resample the audio, which moves the pitch and the length together, then stretch it back to the length it started at without touching the pitch again. That second half is the same grain-matching machinery the speed tool uses.

The consequence is that pitch shifting is stretching, and stretching has a budget. A shift of one to three semitones is clean on almost anything. Past about five, the stretching needed to put the length back starts to be audible on voices in particular — a slight breathiness, a faint flutter on sustained notes. A full octave, twelve semitones, is dramatic and clearly processed, which is fine when that is the point.

Semitones are the unit because they are the unit music uses. Twelve is an octave. Two takes a song from A to B. Seven is a fifth. If you are moving a backing track to suit a singer, two or three either way is the usual amount and sits comfortably inside the clean range.

For anything where the length does not matter — a sound effect, a sample you are going to trim anyway — the speed tool with its pitch lock turned off will give you a cleaner result, because it does the resampling and stops. No stretching means nothing to hear artefacts from.

As with everything else here, the file stays on your machine. It is decoded, rearranged and re-encoded inside this tab.`,
    steps: [
      "Drop in the recording.",
      "Choose how many semitones to move it, up or down. Twelve is a full octave.",
      "Run it — the result is the same length as what you put in.",
      "Listen before you commit; large shifts are audible as processing.",
    ],
    faq: [
      {
        q: "How many semitones is a key change?",
        a: "One semitone is one step on a piano including the black notes, so C to C sharp. Moving a song from A to B is two. From C to G is seven. An octave is twelve.",
      },
      {
        q: "Why does a big shift sound artificial?",
        a: "Because keeping the length constant requires stretching the audio by the same factor as the pitch change, and stretching is a reconstruction. At small factors it is invisible; at large ones the grain joins become audible, particularly on sustained vowels.",
      },
      {
        q: "Can I shift the pitch without any artefacts at all?",
        a: "Only if you let the length change. Use Change Speed with the pitch lock off — that is a pure resample with no reconstruction in it, and the result is clean at any factor. It will be shorter or longer than the original.",
      },
      {
        q: "Does this separate the vocal from the backing?",
        a: "No. Everything in the file moves together, because it is one waveform. Isolating a vocal is a different problem entirely and needs a trained model rather than arithmetic.",
      },
    ],
  },

  "audio-equalizer": {
    intro: `An audio equaliser turns some frequencies up and others down. Three controls — bass, middle and treble — cover most of what anyone actually needs, and they map onto the three things people complain about: too boomy, too muffled, too harsh.

Bass is a shelf below 200 Hz, which means everything under that gets moved together rather than one narrow band being picked out. Treble is the same shape above 4 kHz. The middle control is a peak around 1 kHz, which is where the intelligibility of speech lives — consonants, the difference between "cat" and "cap".

The filters are the standard cookbook biquads, the same formulas the browser's own equaliser node uses. That is deliberate: an equaliser built out of the same maths as everybody else's sounds like everybody else's, and its behaviour can be checked with a test rather than argued about. Boosting the peaking filter by six decibels really does produce six decibels at its centre frequency, and that figure is measured by an automated check rather than trusted.

The presets are starting points rather than magic. "Speech" lifts the middle and thins the low end, which is what makes a recorded voice easier to follow on a phone speaker. "Telephone" cuts hard at both ends for the effect. "Bass boost" does the obvious thing, and the obvious warning applies: boosting bass on a small speaker mostly produces distortion, because the speaker cannot move enough air to reproduce it.

Boosting anything makes the file louder, and a file that was already close to maximum will run out of headroom. Rather than let the peaks clip, the whole track is turned down slightly when that happens, and the result panel tells you it did. That is the right trade — a quiet correct file beats a loud broken one — but if you see that message often, cut the bands you dislike instead of boosting the ones you want.`,
    steps: [
      "Drop in the recording.",
      "Pick a preset, or choose the custom option and set the three bands yourself.",
      "Boost sparingly and cut freely — cutting what you dislike causes fewer problems than boosting what you want.",
      "Run it, listen on the speakers you actually use, and adjust.",
    ],
    faq: [
      {
        q: "Which band should I move to make a voice clearer?",
        a: "The middle one, up by three or four decibels, and the bass down by a similar amount. That is what the Speech preset does. Most of the muddiness in a voice recording is low-frequency room noise that carries no words at all.",
      },
      {
        q: "Why did the whole track get quieter?",
        a: "Because a boost pushed the peaks past the maximum. Rather than clip them, everything was scaled down to fit, which preserves the shape of the sound. You can restore the level afterwards with the volume tool if there is room.",
      },
      {
        q: "Can this remove background hiss or hum?",
        a: "Only crudely. Cutting the treble reduces hiss along with everything else up there, and cutting the bass reduces mains hum along with the warmth. A real noise reduction learns the noise and subtracts it, which three tone controls cannot do.",
      },
      {
        q: "Is this the same as the equaliser in my music player?",
        a: "It uses the same kind of filter, but with one important difference: your player changes what you hear while leaving the file alone, whereas this writes a new file with the change baked in. Keep the original if you might want it back.",
      },
    ],
  },

  "reverse-audio": {
    intro: `Playing audio backwards is the simplest operation in this whole category and the one with the fewest caveats. Every sample is put in the opposite order. Nothing is stretched, filtered, resampled or reconstructed, and running the result through this tool a second time gives you back exactly what you started with, sample for sample — an automated check asserts precisely that on every build.

People come to this for three reasons. The first is the effect: reversed cymbals and reversed piano are staples of production, because a note that swells into its own attack is a sound that does not exist in nature. The second is curiosity about a record that is supposed to contain something backwards. The third is practical — reversing, applying an effect that behaves differently in time, and reversing back is how reverse reverb is made.

There is nothing to configure except the output format, because there is nothing to decide. The only judgement is MP3 or WAV, and for a reversed clip destined for an editor, WAV is the better answer: the reverse is lossless, and it seems a pity to add compression artefacts to an operation that added none.

Worth knowing about what reversal actually does to a sound. Notes have an attack at the front and a decay at the back; reversed, they gain a long swell and end abruptly. Speech becomes unintelligible almost immediately, because the ear identifies consonants largely by how they start. Rhythms survive better than melodies do. And any reverb in the recording becomes a pre-echo, arriving before the sound that caused it, which is the effect that made this a studio technique in the first place.

As with every tool here, the file is decoded, reversed and re-encoded in your browser, and never sent anywhere.`,
    steps: [
      "Drop in the recording.",
      "Choose MP3 to share it or WAV to keep working on it.",
      "Run it and download the result.",
      "Run the result through again if you want to check that it comes back unchanged — it will.",
    ],
    faq: [
      {
        q: "Does reversing lose any quality?",
        a: "The reversal itself loses nothing — it is the same samples in the opposite order. Saving as MP3 compresses the result, as saving any MP3 does. Save as WAV and the operation is entirely lossless.",
      },
      {
        q: "Why does reversed speech sound so strange?",
        a: "Because the ear identifies sounds largely by their attack, and reversing puts the attack at the end. Consonants in particular stop being recognisable, which is why backwards speech is almost impossible to follow even though every sound is still present.",
      },
      {
        q: "Can I reverse just part of a file?",
        a: "Trim the part you want first, reverse that, and join it back to the rest with the Audio Joiner. Three tools, but each of them does one thing you can check.",
      },
      {
        q: "How do I make reverse reverb?",
        a: "Reverse the clip, add reverb to it in an editor, then reverse it back. The reverb tail now runs backwards and arrives before the note, which is the whole effect.",
      },
    ],
  },

  "join-audio": {
    intro: `Putting recordings end to end sounds trivial until the files disagree with each other, and files nearly always disagree with each other.

The common failure is sample rate. A voice note from a phone might be 48 kHz, a download 44.1 kHz. Concatenating those two arrays of numbers without doing anything about it produces a file where the second half plays about nine per cent fast — a small enough error that it does not sound broken, just oddly hurried, which is worse. Every input here is resampled to match the first file before anything is joined, and the result panel says when that happened.

Channel counts disagree too. A mono recording appended to a stereo one, laid out naively, ends up entirely in the left channel. Mono inputs are copied to both sides instead.

Then there is the seam. Butted straight together, two clips produce a step at the join — the same click that trimming causes, for the same reason. Setting an overlap crossfades one into the next instead, and the crossfade is equal-power rather than linear. That distinction matters: two linear ramps crossing meet at half amplitude, which is audibly a dip in the middle of every join. The equal-power curve holds the perceived level constant across the overlap, and there is a test that checks the level does not sag there.

Order is the order in the list, and the list can be dragged, because joining is nearly always assembling something in a deliberate sequence — an interview from its segments, a playlist, a set of voice notes into one file that can actually be sent.

Everything happens in the tab. Recordings of meetings and conversations are exactly the material you should not be handing to a website to concatenate for you.`,
    steps: [
      "Drop in all the recordings.",
      "Drag them into the order they should play in.",
      "Leave the overlap at zero for a clean join, or raise it to fade one into the next.",
      "Name the output, join, and download one file.",
    ],
    faq: [
      {
        q: "Do the files have to be the same format?",
        a: "No. Anything the browser can play can go in, mixed freely — an MP3, a WAV and an M4A join without complaint. They are all decoded to raw audio first, matched to the first file's sample rate, and encoded once at the end.",
      },
      {
        q: "What does the overlap do?",
        a: "It fades the end of one recording into the start of the next over the number of seconds you choose, instead of butting them together. Half a second removes the click at a join; two or three seconds is a musical crossfade.",
      },
      {
        q: "Why does my joined file sound like it changes speed?",
        a: "It should not — inputs are resampled to match before joining, and the note tells you when that happened. If you hear it anyway, the recordings themselves likely differ in speed, which no joiner can correct.",
      },
      {
        q: "Is there a limit on how many I can join?",
        a: "Your device's memory, since every recording is decoded to raw samples while the join runs. Raw audio is roughly ten megabytes per stereo minute, so a few dozen files is comfortable and several hours is not.",
      },
    ],
  },

  "voice-recorder": {
    intro: `A recorder that runs in a browser tab and writes the file to your own machine, with no app to install and no account to make.

Press record, allow the microphone when the browser asks, speak, press stop. What arrives is whatever your browser produced — usually WebM with Opus inside it, which is excellent quality and awkward to send to anybody, because plenty of software still will not open it. This turns it into an MP3 that anything will play, or a WAV if it is going into an editor next.

Levelling is on by default and matters more here than anywhere else on this site. Laptop and phone microphones are held at arm's length in rooms with no acoustic treatment, and the result is almost always far too quiet. Levelling finds the loudest moment and scales the whole recording so that moment sits just below maximum, which brings a whispered voice note up to a normal listening level without you touching a slider. Turn it off if you are recording something where the quiet parts being quiet is the point.

The recording never leaves the tab. The browser writes it into memory here, the encoding happens here, and the file appears as a download from your own machine. There is no upload step to opt out of, and nothing to delete afterwards on somebody's server, because there is no server involved. Closing the tab discards it.

Two practical notes. The browser will ask for microphone permission, and it asks every visit unless you tell it to remember — that is the browser protecting you, not the site being awkward. And when the recording is done it lands in the file list like any dropped file, which means the other tools on this site apply to it: trim the false start off, lift the middle frequencies so the words carry, join several takes into one.`,
    steps: [
      "Press record and allow the microphone when your browser asks.",
      "Speak, then press stop. The recording appears in the file list.",
      "Leave the levelling on unless quiet passages matter, and choose MP3 or WAV.",
      "Save it, then trim or equalise it with the other tools if it needs work.",
    ],
    faq: [
      {
        q: "Where does the recording go?",
        a: "Into this browser tab's memory and nowhere else. It is encoded here and handed to you as a download. Nothing is transmitted, and closing the tab discards it — so save it before you close the page.",
      },
      {
        q: "Why does it ask for microphone permission every time?",
        a: "Because your browser treats microphone access as a per-visit decision unless you tell it to remember this site. That is a protection working correctly. You can make it permanent from the icon in the address bar.",
      },
      {
        q: "How long can I record?",
        a: "Long enough for meetings and interviews. The recording is held in memory, so the ceiling is your device's RAM rather than a time limit we impose; an hour of speech is comfortable on any modern machine.",
      },
      {
        q: "Can I record what is playing on my computer rather than my voice?",
        a: "Not with this. It asks the browser for a microphone, and browsers deliberately keep system audio behind a separate permission that is designed for screen sharing. Recording system audio needs a desktop application.",
      },
    ],
  },
};
