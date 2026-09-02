import type { ToolContent } from "@/lib/tools/types";

/**
 * SEO prose for the video tools. Server-only.
 */
export const VIDEO_CONTENT: Record<string, ToolContent> = {

  "trim-video": {
    intro: `Almost every video anybody records is too long at one end or both. The camera runs for eight seconds before the thing worth filming happens, the interview keeps rolling while somebody reaches for the stop button, the screen capture opens on a desktop nobody meant to show. Taking those pieces off is the first edit most footage ever gets, and it should not involve installing a video editor with a timeline and a project file.

Name the moment it should start and the moment it should stop, and the section between those two points is written out as a new video. Times are read the way a player displays them, so 1:30 and 90 both mean a minute and a half, and either box can be left empty to run from the beginning or to the very end.

What happens underneath is worth knowing, because it explains why a trimmed file is not always as small as the fraction you kept. Compressed video is not a row of independent pictures. Most frames describe only what changed since a nearby key frame, so a cut that lands between key frames leaves frames that refer backwards to material no longer in the file. Those are rebuilt; the long stretches in between are carried across as they are. The cut therefore lands exactly where you asked rather than at the nearest key frame, which is the compromise cheaper tools make and the reason their output starts a second early.

The decoding and the encoding are done by this browser, using the same components it uses to play video on any other site. Your footage is never sent anywhere — which for a recorded meeting, a medical scan or a video of somebody's children is not a feature, it is the only acceptable arrangement.`,
    steps: [
      "Drop the video in.",
      "Type where the clip should start and where it should end.",
      "Pick a container — MP4 unless you have a reason to want otherwise.",
      "Run it, then download the result.",
    ],
    faq: [
      {
        q: "How do I find the right times?",
        a: "Play the file in whatever you normally watch it in and read the counter. Both boxes take exactly what a player shows, so 2:15 works and so does 135.",
      },
      {
        q: "Can I cut a section out of the middle?",
        a: "Not in a single pass. Trim the part in front of it, trim the part behind it, and put the two results together with Merge Videos.",
      },
      {
        q: "Why is my trimmed file not much smaller?",
        a: "Because the size of a video depends on what is happening in it, not only on how long it runs. Thirty seconds of a moving camera can be larger than two minutes of a still one.",
      },
      {
        q: "Is there a limit on length?",
        a: "The practical limit is memory rather than a rule. The finished file is assembled in this tab, so a very long recording on a phone may run out of room where the same file on a laptop will not.",
      },
    ],
  },

  "compress-video": {
    intro: `A video that will not attach to an email, will not upload to a form, or eats a quarter of the space on a phone has one of two problems, and telling them apart saves a lot of wasted effort.

If the file is large because the picture is enormous — 4K footage of a whiteboard, a 1080p screen recording of some text — then resolution is the lever. Halving the height quarters the number of pixels, and no quality setting ever devised competes with removing three quarters of the data before compression begins. That is why the resolution control sits at the top of this page and defaults to 720p, which is more than enough for anything watched on a phone or embedded in a document.

If the file is large because a great deal is happening in it — a hand-held walk through a market, confetti, rain — then quality is the lever, and the honest news is that there is less room than people hope. Movement is genuinely expensive to store. Dropping the quality on busy footage buys size at a visible cost, and no tool avoids that trade by being clever.

The third control, frame rate, is the one people forget. A screen recording of somebody scrolling through a document does not need sixty frames a second; fifteen looks identical and stores a quarter as much. On real-world footage of moving people it is much less forgiving, which is why it is left alone by default.

One warning that saves disappointment: a file that has already been compressed hard — anything downloaded from a social platform — will not shrink much further without becoming visibly worse. The size it arrived at was somebody else's answer to this same question, and they had the original to work from.`,
    steps: [
      "Add one video or a batch of them.",
      "Choose a resolution to shrink to. This does more than everything else on the page combined.",
      "Lower the frame rate if the footage is a screen recording or a slideshow.",
      "Set the quality, run it, and compare the before-and-after figures under the result.",
    ],
    faq: [
      {
        q: "How small can it get?",
        a: "A 1080p phone clip taken down to 720p at medium quality typically lands between a fifth and a half of its original size. Footage that is already compact will barely move.",
      },
      {
        q: "Can I hit an exact target size?",
        a: "Not directly here. Pick a resolution, look at the size reported under the result, and drop one step further if you are still over. Two passes almost always land it.",
      },
      {
        q: "Does it lose quality?",
        a: "Yes, and any tool claiming otherwise is either not compressing or not telling you. The controls exist so you can choose where the loss goes: fewer pixels, fewer frames, or coarser detail.",
      },
      {
        q: "Will it work on several files at once?",
        a: "Yes. Add them all and the same settings run down the list, one after another, with progress shown per file.",
      },
    ],
  },

  "convert-video": {
    intro: `Format arguments between video files are really arguments about two separate things that get muddled together: the container, which is the box, and the codec, which is how the pictures inside it are written. A file called MP4 is a box that usually holds H.264 video and AAC audio. A WebM is a box that usually holds VP9 and Opus. Changing the box is cheap; changing what is in it is not.

This tool changes both when it has to and only what it must. MP4 is the default because it is the file that plays everywhere without a conversation — televisions, old phones, presentation software, the upload form that rejects everything else. WebM is offered beside it because its codecs are royalty-free and because a machine that cannot encode H.264 can nearly always encode VP9. MKV takes essentially anything, which makes it useful as an archive and useless as something to send to a colleague. MOV is what a Mac hands you and what several editing suites prefer to be given back.

The conversion runs on the codecs this browser already ships in order to play video. There is no separate media library to download first and no thirty-megabyte wait before the first click, and because everything happens in this tab, a confidential recording is never handed to a server that promises to delete it later.

The limit that follows from this is worth stating plainly rather than hiding: what can be read is what this browser can play. A file in an unusual codec will be refused with a message saying so, instead of appearing to work and producing something broken.`,
    steps: [
      "Add the videos you want converted.",
      "Choose the container you need. MP4 for sending to people, WebM for the web, MKV to keep, MOV for an editor.",
      "Set a quality — high is a sensible default and only matters when the codec has to change.",
      "Convert, then download.",
    ],
    faq: [
      {
        q: "Which format should I pick?",
        a: "MP4, unless something specific told you otherwise. It is the only one you can send to a stranger and be confident it opens.",
      },
      {
        q: "Does converting lose quality?",
        a: "It does whenever the video has to be encoded again, which is most of the time. Where the existing frames can simply be moved into the new container untouched, nothing is lost at all.",
      },
      {
        q: "Why was my file refused?",
        a: "Because this browser could not decode what was inside it. That happens with older or unusual codecs, and it is better to hear so straight away than to receive a file with no picture in it.",
      },
      {
        q: "Can it convert AVI or WMV?",
        a: "No. Those containers are not read here. Anything a modern browser can play — MP4, MOV, WebM, MKV, MPEG-TS — is fair game.",
      },
    ],
  },

  "resize-video": {
    intro: `Resolution is the single number that decides most of what a video costs to store, to send and to play. It is also the number people are least sure about, because the shorthand hides what it means: 1080p is not a size, it is a height, and the width follows from the shape of the frame.

Two ways of asking are offered here. The presets are the standard heights — 2160, 1440, 1080, 720, 480, 360, 240 — and picking one keeps the original proportions exactly, working out the width for you and rounding it to an even number because encoders require that. This is what almost everybody wants and it cannot produce a distorted result.

The exact route is for the cases where a specific number has been imposed on you: a display board that wants 1024 across, an app that refuses anything over a set height. Give one dimension and leave the other at zero and the shape is preserved. Give both and you have to say what should happen when they disagree with the original shape, which is a real question with three real answers: fit the whole picture inside and accept bars at the edges, fill the frame and lose what falls outside it, or stretch and accept that faces will be the wrong shape.

Enlarging is refused unless you insist. Scaling a 480p recording up to 1080p does not recover detail that the sensor never captured; it produces a bigger file containing the same information, softened. There are occasions when a delivery specification demands it anyway, so the switch exists — but it is off, and it says why.`,
    steps: [
      "Drop the video in.",
      "Choose a standard height, or switch to exact dimensions if a number has been dictated to you.",
      "If you give both a width and a height, say what should happen when the shape does not match.",
      "Resize and download.",
    ],
    faq: [
      {
        q: "What is the difference between resizing and cropping?",
        a: "Resizing keeps the whole picture and changes how many pixels describe it. Cropping keeps the pixels and throws away the parts of the picture outside your rectangle.",
      },
      {
        q: "Why did it refuse to make my video bigger?",
        a: "Because enlarging invents nothing. The switch marked \"allow enlarging\" overrides it when a delivery requirement leaves you no choice.",
      },
      {
        q: "Why are the numbers always even?",
        a: "Video encoders work in blocks of pixels and nearly all of them reject odd dimensions outright. Rounding here is quieter than failing there.",
      },
      {
        q: "Will the video still play on a television?",
        a: "Yes, as long as you save as MP4. Odd resolutions are fine; it is unusual codecs that cause trouble on that kind of hardware.",
      },
    ],
  },

  "crop-video": {
    intro: `Cropping throws part of the picture away for good, which is what makes it useful. A recording made in landscape needs to become a tall rectangle for a phone-shaped feed. A screen capture has a browser's toolbars around the thing worth showing. A talk was filmed from too far back and the speaker occupies a third of the frame.

The rectangle is given as percentages rather than pixels, and that is deliberate. A percentage means the same thing whether the source is 4K or 480p, which means the same settings can be applied to a second file of a different size and still describe the same part of the picture. Left and top place the corner; width and height set how much is kept from there.

Two things about the result are worth expecting. The output is smaller in every sense — fewer pixels across, fewer down, and a proportionally smaller file — because the discarded region genuinely stops existing rather than being hidden. And the dimensions are nudged to even numbers, since practically every video encoder in existence refuses odd ones.

For the common social-media shapes, a little arithmetic helps. A square from a 16:9 source is 56 per cent of the width, centred, which means starting 22 per cent from the left. A 9:16 portrait crop from the same source is 32 per cent of the width, so 34 per cent from the left. Those are the two that come up constantly, and they are worth writing down somewhere.

If your aim is to conceal something rather than to reframe — a name badge, a face, a licence plate — cropping is the wrong instrument unless what you want gone happens to sit at the edge. Blur Part of a Video handles the middle of the frame.`,
    steps: [
      "Add the video.",
      "Set how far in from the left and the top the kept rectangle starts.",
      "Set its width and height as a percentage of the original frame.",
      "Crop, check the reported dimensions under the result, and download.",
    ],
    faq: [
      {
        q: "How do I crop to a square?",
        a: "From 16:9 footage, set the width to 56 per cent and the left offset to 22 per cent, leaving the height at 100. That takes a centred square from the full height.",
      },
      {
        q: "Why percentages instead of pixels?",
        a: "Because a rectangle described in per cent means the same thing at any resolution, so the same numbers can be reused on a different copy of the same footage.",
      },
      {
        q: "Can I remove a watermark by cropping it off?",
        a: "Only if it sits at an edge you are willing to lose. If it does not, use the blurring tool — and remember that removing somebody else's mark may not be yours to do.",
      },
      {
        q: "Does cropping reduce the file size?",
        a: "Usually yes, and roughly in proportion to the area removed, because there is genuinely less picture to store.",
      },
    ],
  },

  "rotate-video": {
    intro: `A video filmed on a phone held sideways is one of the most reliably annoying files in existence. It plays correctly in the app that recorded it, then arrives on a computer lying on its side, and everybody involved blames a different piece of software.

The explanation is that there are two ways a video can be rotated, and only one of them is a fact about the pictures. A phone records the frames in whatever orientation its sensor sits in and writes a small number in the file's header saying "display this turned ninety degrees". Players that read that number show it correctly. Players that ignore it — and plenty do, including a surprising number of upload forms, presentation packages and social platforms — show the frames as recorded, on their side.

So this tool offers both. Left switched on, it turns the pixels themselves: every frame is redrawn in its new orientation and the file no longer relies on anyone honouring a flag. That costs a re-encode and a little quality, and it works absolutely everywhere. Switched off, it writes the flag instead, which is instant, loses nothing at all, and works only where the flag is respected.

The default is to turn the pixels, because somebody arriving here has almost certainly already been let down by the flag. If your file is going straight into an editor that handles orientation properly, the cheap route is genuinely better and the switch is right there.

Ninety degrees clockwise, a hundred and eighty, and ninety anticlockwise are the three turns available. Anything else would need the frame padded out with blank corners, which is a compositing job rather than a rotation.`,
    steps: [
      "Add the sideways video — or several, if a whole shoot came out the same way.",
      "Choose which way to turn it.",
      "Leave \"turn the pixels\" on unless you know the next piece of software reads rotation flags properly.",
      "Rotate and download.",
    ],
    faq: [
      {
        q: "Why does my video look right on my phone and wrong on my computer?",
        a: "Because the phone is reading a rotation flag in the file and the computer's player is ignoring it. Turning the pixels removes the disagreement entirely.",
      },
      {
        q: "Which way is 90 degrees?",
        a: "Clockwise, as you look at the picture. If the top of your subject currently points to the left, that is the one you want.",
      },
      {
        q: "Does rotating lose quality?",
        a: "Turning the pixels means encoding the frames again, which costs a little. Writing the flag instead costs nothing, and the option is on the same page.",
      },
      {
        q: "What about a small tilt, five or ten degrees?",
        a: "No. Small arbitrary angles leave empty corners that have to be cropped or filled, which is a different job from a quarter turn.",
      },
    ],
  },

  "flip-video": {
    intro: `Mirroring sounds like a novelty until you meet the two situations where it is the only fix.

The first is selfie footage. Front-facing cameras show you a mirror image while you record, because that is what people expect to see of themselves, and most save the file the same way round. Any text in the shot — a book cover, a sign, a whiteboard, a T-shirt — comes out backwards. Mirroring left-to-right puts the writing the right way round, at the cost of moving your parting to the other side of your head, which nobody but you will notice.

The second is comparison. Two clips of the same movement filmed from opposite sides are hard to compare until one is flipped. Coaches do this constantly with a golf swing or a bowling action, and so does anyone matching a demonstration to their own attempt.

Left-to-right is the usual one. Top-to-bottom is genuinely rare and mostly turns up with footage from a camera mounted upside down under a mount or a drone. Both together is the same result as turning the video a hundred and eighty degrees, and it is offered here because it is easier to find under this name than to reason about as a rotation.

Every frame is redrawn, which means the video is encoded again and the file is rebuilt. There is no flag for mirroring the way there is for rotation — no container in common use stores one — so this is the only way it can be done, and the same is true in any other tool that offers it.`,
    steps: [
      "Drop in the clip.",
      "Choose left-to-right, which is what selfie footage needs.",
      "Run it, and check any writing in the picture reads correctly.",
      "Download the mirrored version.",
    ],
    faq: [
      {
        q: "Why is the text in my video backwards?",
        a: "The camera saved the mirror image it was showing you while you filmed. Flipping left-to-right undoes it.",
      },
      {
        q: "Is flipping the same as rotating?",
        a: "No. A rotation turns the frame; a flip reflects it. Flipping both ways at once happens to give the same picture as a half turn, but no single flip matches a quarter turn.",
      },
      {
        q: "Does it affect the sound?",
        a: "Not at all. The audio track is carried through untouched.",
      },
      {
        q: "Will it fix a video recorded upside down?",
        a: "Use the rotation tool and choose 180 degrees. Flipping both axes reaches the same picture, but the rotation is the more direct way to ask.",
      },
    ],
  },

  "change-video-speed": {
    intro: `Speeding a video up and slowing it down are the same operation seen from two sides: every frame is given a new moment to appear at, and the file is rebuilt around that new timing.

Speeding up is what turns twenty minutes of a plant growing, a room being painted or a journey being driven into something anybody will actually sit through. Four times and eight times are the useful settings for that, and above eight there is generally nothing left for a viewer to follow. Slowing down is for the opposite case: a fast movement you want to inspect, a moment that went past too quickly to see.

There is an honest limit to slow motion that is worth knowing before you are disappointed. Playing footage at quarter speed does not create any frames that were not recorded. A clip filmed at thirty frames a second becomes, in effect, seven and a half frames a second of new information, held on screen four times as long. It will look stepped, because it is. Genuinely smooth slow motion has to be recorded at a high frame rate in the first place — that is what a phone's slow-motion mode does, and no tool can reconstruct it afterwards.

The sound is the other decision. Speeding audio up raises its pitch, exactly as a record played too fast does, and voices turn comic. That is the honest default here, since it keeps sound and picture together. If the pitch matters more than the sound does, drop the audio and lay a track over the result with Add Audio to Video — or take the sound out first and stretch it properly with Change Audio Speed, which preserves pitch, then bring the two back together.`,
    steps: [
      "Add the video.",
      "Pick a speed. Four times and above is timelapse territory; a half or a quarter is for inspecting a movement.",
      "Decide whether to carry the sound along or drop it.",
      "Run it and check the new length reported under the result.",
    ],
    faq: [
      {
        q: "Why does everyone sound like a chipmunk?",
        a: "Because the sound is being played faster and pitch rises with speed. Choose to drop the sound, or stretch the audio separately with the tool that preserves pitch.",
      },
      {
        q: "Why does my slow motion look jerky?",
        a: "There are no extra frames to show. The clip was filmed at an ordinary frame rate, so slowing it holds each frame on screen longer instead of revealing anything new.",
      },
      {
        q: "How much faster can it go?",
        a: "Eight times. Beyond that a viewer cannot follow what is happening, and the result is a flicker rather than a timelapse.",
      },
      {
        q: "Does the file get smaller when sped up?",
        a: "Usually, since there is less running time to store — though a fast-moving picture is expensive per second, so the saving is rarely proportional.",
      },
    ],
  },

  "merge-videos": {
    intro: `Merging clips end to end is the most basic act of editing there is, and it is the one that most often sends people looking for software far heavier than the job deserves.

Clips are merged in the order they appear in the list, which is the order you added them. Everything is redrawn at the first clip's dimensions, and this is the part worth understanding before you start, because it decides how the result looks. Whichever video you put first sets the frame for all of them. If clip one is landscape and clip two was filmed on a phone held upright, the portrait footage is fitted inside the landscape frame with black at the sides. It is not stretched and nothing is cropped away — the shape of every clip is preserved. If you would rather the whole film were portrait, put a portrait clip first.

Sound is handled to match. Each clip contributes exactly as much audio as it has picture, and a clip with no sound at all contributes silence of precisely the right length. That sounds obvious and is the thing cheap joiners get wrong: without it, one silent clip in the middle pulls every subsequent second of audio forward and the rest of the film drifts out of sync with its own soundtrack.

Because every clip has to be brought to a common size and a common codec, everything is decoded and encoded again. Joining four clips therefore takes roughly as long as watching them. There is no shortcut that avoids this when the sources differ, and sources almost always differ.`,
    steps: [
      "Add all the clips. They are joined in the order listed, so add them in the order you want them.",
      "Put the clip whose shape you want the finished film to have at the top.",
      "Choose a container and a quality.",
      "Join them, then download the single file.",
    ],
    faq: [
      {
        q: "Why does my joined video have black bars?",
        a: "One of the clips is a different shape from the first one and has been fitted inside the frame rather than stretched or cropped. Reordering so that a clip of the shape you want comes first changes the frame.",
      },
      {
        q: "Can I reorder the clips before merging?",
        a: "Remove them and add them again in the order you want. The list order is the film order.",
      },
      {
        q: "Why does it take so long?",
        a: "Because the clips have to be made compatible before they can be joined, which means decoding and re-encoding all of them. Expect roughly the running time of the footage.",
      },
      {
        q: "Can I add a fade between clips?",
        a: "Not here. The joins are straight cuts. A crossfade needs a timeline editor, which this deliberately is not.",
      },
    ],
  },

  "loop-video": {
    intro: `There is a difference between a video that loops and a player that repeats, and it matters more than it sounds.

A player set to repeat is a setting on somebody else's software. Put the same file on a slide, in a shop display, in a message, or on a page that autoplays it, and the setting is gone — the clip runs once and stops. A looped file, by contrast, contains the repetition. The clip is written into it several times over, end to end, and it therefore repeats everywhere a video plays at all, including all the places that ignore what a player was told.

That is what this does. Choose how many times, and the copies are laid down one after another in a single file, with the sound repeating in step. Two to fifty repeats are allowed; the upper limit exists because the finished file is assembled here in the tab, and fifty copies of a two-minute clip is an hour and a half of video that no phone will hold in memory.

The practical uses are narrower than the theory. Short clips destined for a display screen, a stall, or a background on a stand. A three-second reaction that needs to be six seconds long to survive a platform's minimum. A test file for anything that has to handle a long video without you having to film one.

Whether the seam is visible depends entirely on your footage, not on this tool. A clip that ends where it began joins invisibly; one that ends somewhere else will jump, and no amount of processing hides that. Trimming the clip so its last frame resembles its first is what makes a loop look seamless.`,
    steps: [
      "Add the clip you want repeated.",
      "Set how many times it should run.",
      "Choose the container and quality.",
      "Build the loop and download one file containing all the repeats.",
    ],
    faq: [
      {
        q: "Why not just tick repeat in the player?",
        a: "Because that setting does not travel with the file. Anywhere else it plays, it plays once.",
      },
      {
        q: "How many repeats can I have?",
        a: "Up to fifty, and less than that if the clip is long — the whole result is built in this tab, so total running time is the real constraint.",
      },
      {
        q: "Why can I see the join?",
        a: "Because the last frame of your clip does not resemble the first. Trim the clip so the two ends match and the seam disappears.",
      },
      {
        q: "Does the sound loop as well?",
        a: "Yes, in step with the picture. Each repeat carries its own copy of the audio.",
      },
    ],
  },

  "mute-video": {
    intro: `Removing a sound track is a small operation with a surprising number of good reasons behind it.

Someone is talking in the background of a clip you want to share. A screen recording caught a notification chime, or your own breathing, or a conversation in the next room. A video is going on a website where it will autoplay, and a page that makes noise at a visitor unprompted is a page they leave. A clip is destined to sit under different music entirely, and the original sound would only fight it. In every one of those cases the picture is fine and the audio simply has to go.

What makes this worth doing properly rather than turning the volume to zero is that a silenced track is still a track. It still occupies space in the file, and — this is the part that matters — it still contains everything that was said. Anyone who receives that file can turn it back up. Removing the track deletes the recording; muting it merely hides it.

So this removes it. The track is dropped from the file altogether, and the picture is carried across untouched wherever the container allows it, which means muting a video costs no quality at all in the vast majority of cases. The result is also slightly smaller, since a sound track is no longer being stored.

If what you want is quieter rather than silent, that is Change Video Volume. If you want to keep what was said, run Video to MP3 first: it lifts the audio out into its own file, and you can mute the video afterwards with the words safely stored somewhere else.`,
    steps: [
      "Add the video, or a batch of them.",
      "Choose the container to save as.",
      "Remove the sound.",
      "Download — and check the file size, which will have dropped a little.",
    ],
    faq: [
      {
        q: "Is this different from setting the volume to zero?",
        a: "Completely. A track at zero volume still holds every word that was recorded and anyone can turn it up. This takes the track out of the file.",
      },
      {
        q: "Does the picture suffer?",
        a: "No. The video frames are carried across as they are wherever the format permits it, so nothing is re-encoded and nothing is lost.",
      },
      {
        q: "Can I get the sound back afterwards?",
        a: "Not from the muted file. Keep the original, or take the audio out into its own file first with Video to MP3.",
      },
      {
        q: "Can I mute only part of the video?",
        a: "Not in one pass. Trim the section, mute it, and join the pieces back together.",
      },
    ],
  },

  "change-video-volume": {
    intro: `Two different complaints hide behind "the sound on this video is wrong", and one volume control answers both, pushed in opposite directions.

The first is a recording made too far from whoever was speaking. A phone on a table at the far end of a room, a laptop microphone catching a person two metres away, a camera that prioritised the wind over the voice. The result plays at a level where the viewer has to turn everything else down to hear it, and every subsequent video they watch then deafens them.

The second is a clip that is far too loud, which happens most often with music laid under speech by an app that assumed you wanted a music video. It clips on cheap speakers and it startles people watching at night.

Volume here is set in decibels, which is not intuitive until you know two numbers: adding six roughly doubles the perceived loudness, and taking six away roughly halves it. Most quiet recordings want somewhere between six and twelve. Anything above fifteen is worth suspecting, because a recording that needs it is usually one where the voice was barely captured, and multiplying a whisper multiplies the room hiss with it.

There is a ceiling and it is absolute. Digital audio cannot represent a value beyond its maximum, and a sample pushed past it has to go somewhere. Written carelessly it wraps round into a large negative value, which turns a peak into a crack of distortion and hands back a supposedly improved file that is worse than the one you started with. Here the samples are held at the maximum instead, so an over-ambitious setting flattens the loudest moments rather than destroying them, and you are told underneath the result that it occurred, which is the point at which to reduce the setting rather than after somebody else has heard it.

The picture is untouched throughout. Only the sound track is rebuilt.`,
    steps: [
      "Add the video.",
      "Move the slider — positive to make it louder, negative to quieten it.",
      "Run it, then listen to the result before you rely on it.",
      "If the panel warns that peaks were flattened, come back a few decibels and run it again.",
    ],
    faq: [
      {
        q: "How many decibels do I need?",
        a: "Start at six, which sounds like about double. Twelve is a strong lift for a genuinely distant recording. Past fifteen you are mostly amplifying the room.",
      },
      {
        q: "Why did adding more stop making it louder?",
        a: "The loudest peaks have reached the ceiling and are being held there. Everything below them still rises, but the difference narrows and the sound starts to feel harsh.",
      },
      {
        q: "Does this change the picture?",
        a: "No. Only the audio track is rebuilt; the video frames go across as they are.",
      },
      {
        q: "Can I make one section louder than another?",
        a: "Not in a single pass. Trim the section out, lift it on its own, and join the pieces back together.",
      },
    ],
  },

  "add-audio-to-video": {
    intro: `Putting a different sound under a video covers three quite different jobs, and this handles all of them with two settings.

Replacing is the common one. A silent screen recording needs a voiceover. A clip filmed in a noisy street needs music instead of traffic. Footage of a machine, a pet or a process has sound that adds nothing and a track that adds a lot. The video's own audio goes, the new file's audio takes its place.

Mixing keeps both, with a level control deciding the balance. This is what you want when the original sound carries information — somebody speaking, a demonstration where the noise is the point — and the added track is there to sit underneath. Fifty per cent gives each an equal share; below thirty the new track becomes background, which is usually right for music beneath a voice.

The third job is the mismatch nobody plans for: the sound is a different length from the picture. A three-minute song under a forty-second clip, or a twenty-second loop under two minutes of footage. Repeating the track to the end is right for music and wrong for narration, where the sensible thing is to let it stop, so both are offered and neither is guessed at.

One detail is worth the paragraph: the picture is not re-encoded to gain a new soundtrack. The existing frames are carried into the new file untouched wherever the container permits, and only the audio is built. That is why this finishes far faster than joining or cropping, and why the visual quality is exactly what you started with.`,
    steps: [
      "Add two files: the video first, then the sound.",
      "Decide whether the new track replaces the original or mixes over it.",
      "Say what should happen if the sound runs out before the video does.",
      "Run it, and listen to the whole thing before sending it anywhere.",
    ],
    faq: [
      {
        q: "What order do the files go in?",
        a: "Video first, sound second. Both go into the same drop area, and the list shows which is which.",
      },
      {
        q: "What audio formats can I use?",
        a: "Whatever this browser can play — MP3, WAV, M4A, OGG and usually FLAC all work.",
      },
      {
        q: "Can I start the music partway through the video?",
        a: "Not directly. Trim the audio first so its beginning is where you want the music to start, then bring it here.",
      },
      {
        q: "Why is this so much quicker than the other video tools?",
        a: "Because the frames are not rebuilt. Only the sound track is created, and the picture is copied straight across.",
      },
    ],
  },

  "video-to-mp3": {
    intro: `Pulling the sound out of a video is one of those tasks that appears simple and is usually surrounded by advertising, sign-ups and a queue on somebody else's server. It is not a complicated operation. The audio is already there as a separate track inside the file; the job is to lift it out and write it into a container that holds sound alone.

The reasons people need it are consistent. A recorded lecture, meeting or interview that only needs to be listened to, and takes a tenth of the space without the picture. A talk to put on a phone for a commute. A piece of dialogue destined for a transcription tool that wants audio. A soundtrack extracted from one clip to lay under another.

MP3 leads here because practically every device ever built will play one, car stereos and equipment predating streaming included. WAV is the alternative and it throws nothing away: the samples are written out uncompressed, at roughly ten times the size, which is exactly what you want when the audio is going into an editor for further work and exactly what you do not want when you are emailing it to somebody.

A note on quality that applies to any tool of this kind. The audio inside a video was already compressed once when the video was made. Writing it out as MP3 compresses it again, and a second pass always costs a little. For speech this is inaudible at a sensible setting. For music you intend to keep, choose WAV and accept the size — the extra loss is not worth the saving.

If your file has no sound track at all, that is reported plainly rather than handing you an empty file.`,
    steps: [
      "Add one video or a batch.",
      "Choose MP3 to listen to, WAV if the sound is going into an editor.",
      "Pick a quality if you chose MP3.",
      "Extract, then download each track.",
    ],
    faq: [
      {
        q: "Which should I pick, MP3 or WAV?",
        a: "MP3 for listening, sending or archiving speech. WAV when the audio is raw material for something else and you want no further loss.",
      },
      {
        q: "How much smaller is the result?",
        a: "Typically a tenth to a twentieth of the video for MP3, since the picture is the overwhelming majority of a video file.",
      },
      {
        q: "Can I extract from several videos at once?",
        a: "Yes. Add them all and each produces its own audio file, named after its source.",
      },
      {
        q: "It says my video has no sound. Why?",
        a: "Some recordings genuinely have no audio track — screen captures made without audio permission are the usual culprit. There is nothing to extract in that case.",
      },
    ],
  },

  "video-to-gif": {
    intro: `A GIF is a strange format to be using in 2026 and it is not going away, because it is the only moving image that plays absolutely everywhere: in a chat window, in an email, in a document, in a bug report, on a page that blocks video. That reach is the entire argument for it, and it comes at a considerable price.

The price is that GIF has no compression between frames. Modern video stores one full picture and then, for the following frames, only a description of what changed — which is why a minute of video can be smaller than a single high-resolution photograph. A GIF stores every frame whole, in a palette of at most 256 colours, and nothing about that changed since the format was designed in 1987. Ten seconds at full width is not a large GIF, it is an enormous one, measured in tens of megabytes, and it will be refused by the very chat window you made it for.

So the three controls here are all size controls, and the defaults are already conservative. Width at 480 pixels is generous for something that will be viewed inline. Twelve frames a second reads as movement without storing twice the frames that fifteen would. Keeping the clip under about five seconds is the single most effective thing you can do.

One technical decision worth mentioning: each frame gets its own palette of 256 colours rather than sharing one across the whole animation. On a scene that changes — someone walking past a window, a screen recording that scrolls — that tracks the colours far better and avoids the muddy banding a single shared palette produces. It costs a little size and is nearly always the right trade.

There is no sound. GIF has never had any.`,
    steps: [
      "Add the video and set the start and end times for the section you want.",
      "Keep it short. Three to five seconds is where GIFs stay usable.",
      "Set the width and frame rate — lower on both if the file comes out too big.",
      "Build the GIF, check the size reported underneath, and download.",
    ],
    faq: [
      {
        q: "Why is my GIF so large?",
        a: "Because every frame is stored whole. Cut the length, then the width, then the frame rate — in that order, since length is the biggest multiplier.",
      },
      {
        q: "Why do the colours look wrong?",
        a: "GIF allows 256 colours per frame. Gradients, skin tones and video noise all suffer, and no encoder avoids that limit.",
      },
      {
        q: "Can I have sound in it?",
        a: "No. The format has no provision for audio at all. If you need sound, a short MP4 is what you actually want.",
      },
      {
        q: "What length is sensible?",
        a: "Under five seconds for anything you are going to send to somebody. Ten is possible at a small width and a low frame rate.",
      },
    ],
  },

  "video-thumbnail": {
    intro: `Sometimes the thing you need out of a video is a still picture: a thumbnail for a page, an illustration for a document, a frame showing the moment an error appeared on screen, a photograph of something that was only ever filmed.

Give a time and the frame at that moment comes back as a PNG or a JPEG. Times read the way a player shows them, so 1:24 works and so does 84. Leave it empty and you get the opening frame — which, worth knowing, is very often the least useful frame in the whole video, since most recordings begin before anything has happened.

PNG is the default and reproduces exactly what the decoder produced, pixel for pixel. That matters when the frame contains text, a user interface, a diagram or anything with hard edges, and it matters when the image is evidence of something. JPEG is a fraction of the size and is the better choice for a thumbnail nobody is going to inspect closely, with a quality slider for when the difference starts to show.

The width control resizes on the way out, which is the tidy way to produce a set of thumbnails at a fixed size without a second tool. Leave it at zero and you get the video's own dimensions.

One thing that occasionally surprises: asking for a frame very near the start of a file can return the nearest available picture rather than the exact instant, because a video has nothing to display before its first key frame. Ask for a moment a second or two later and the problem disappears.

Add several videos and each produces its own image at the same timestamp, which is how you build a contact sheet for a shoot.`,
    steps: [
      "Add one video or several.",
      "Type the moment you want, as seconds or as minutes and seconds.",
      "Choose PNG for anything with text or detail, JPEG for a lightweight thumbnail.",
      "Grab the frame and download the image.",
    ],
    faq: [
      {
        q: "Which format should I choose?",
        a: "PNG when the frame contains text, an interface or fine detail. JPEG when it is a photograph-like scene and size matters more than exactness.",
      },
      {
        q: "Why did I get a slightly different moment than I asked for?",
        a: "The frame returned is the last one at or before your timestamp. Near the very start of a file there may be nothing earlier to return, so it comes from the first available picture.",
      },
      {
        q: "Can I get a frame from several videos at once?",
        a: "Yes. Every video in the list produces an image at the same time position, named after its source.",
      },
      {
        q: "How do I make a set of thumbnails from one video?",
        a: "Run it several times with different times. Each run gives you one frame, and the width setting keeps them all consistent.",
      },
    ],
  },

  "add-text-to-video": {
    intro: `Text drawn into a video is permanent in a way that a caption file is not. A subtitle track can be switched off, ignored by a player, or stripped when a platform re-encodes the file. Words burned into the frames are part of the picture, and they arrive wherever the video arrives.

That is exactly what you want for a title on a clip, a name and role under somebody speaking, a date on footage that will be referred to later, a credit, a watermark made of words, or a warning that has to be seen. It is exactly what you do not want for translated dialogue, where a viewer needs the option to turn it off and where a real subtitle file is the correct answer.

The size is given as a percentage of the frame height rather than in points, and that is deliberate: six per cent of the height looks the same on a 4K master and on the 480p copy somebody shares afterwards, whereas a fixed point size would be unreadable on one and enormous on the other. Nine anchor positions cover the placements that come up in practice, with a margin control to keep the text clear of the edge — where phone interfaces, platform overlays and rounded corners tend to eat it.

The shadow is on by default, and it earns its place. White text is unreadable over a bright frame and black text disappears into a dark one, and a video's frames are not one colour — they change constantly. A soft shadow behind the letters costs nothing and keeps them legible over both, which is why every broadcaster does it.

Line breaks in the box become line breaks on screen, so a two-line title is typed as two lines.`,
    steps: [
      "Add the video.",
      "Type the words. Press return for a second line.",
      "Choose where they sit and how large they are relative to the frame.",
      "Run it, then watch the result over the busiest part of the footage to check it reads.",
    ],
    faq: [
      {
        q: "Can I remove the text later?",
        a: "No. It becomes part of the picture, which is the whole point. Keep the original file if you might want a version without it.",
      },
      {
        q: "Can the text appear only for part of the clip?",
        a: "Not in one pass. Trim the section, add text to that piece, and join the film back together.",
      },
      {
        q: "Why is the size a percentage?",
        a: "So the text stays proportionate whatever the resolution. A fixed size would be tiny on 4K footage and overwhelming on a small copy of it.",
      },
      {
        q: "Should I use this for subtitles?",
        a: "Only if they must be unremovable. For ordinary translated dialogue a proper subtitle file is better, because the viewer can turn it off.",
      },
    ],
  },

  "add-image-to-video": {
    intro: `A logo drawn onto the frames of a video travels with it. It survives being downloaded, re-uploaded, compressed by a platform, screen-recorded and sent on again, because at that point it is no longer a mark on the video — it is part of the picture.

That durability is the reason to do it and the reason to think first. Photographers, agencies and course-makers put a mark on preview footage precisely because it cannot be lifted off. A tutorial with a channel name in the corner keeps its attribution through however many re-posts follow. Draft footage sent for approval carries a "not for release" mark that no reviewer can mislay.

Placement matters more than people expect. Bottom right is the convention and is the default, but on video destined for a phone-shaped feed the bottom of the frame is where platform interfaces live — captions, buttons, usernames — and a mark placed there is buried under them. Bottom left or top right survives that better. The margin control exists for the same reason.

Opacity at eighty-five per cent is the default rather than full strength because a solid logo competes with the footage. Between sixty and eighty is where a mark reads clearly without dominating; below forty it becomes decorative and stops doing its job. Width is set as a share of the frame, so twenty per cent means a fifth of the picture's width whatever the resolution, and a PNG with a transparent background sits on the footage properly rather than in a white box.

Two files go in: the video first, then the image. Every frame is redrawn with the mark on it, which means the whole video is encoded again — there is no way to draw on a picture without rebuilding it.`,
    steps: [
      "Add two files — the video, then the logo or watermark image.",
      "Choose a corner, and consider which parts of the frame a platform will cover with its own interface.",
      "Set the width as a share of the frame and lower the opacity until it reads without shouting.",
      "Run it and watch a bright section to check the mark still shows.",
    ],
    faq: [
      {
        q: "What image should I use?",
        a: "A PNG with a transparent background. A JPEG will bring its own rectangle of white or black onto the footage with it.",
      },
      {
        q: "Can the mark be taken off afterwards?",
        a: "Not from the finished file. The original pixels underneath are gone. That permanence is the reason the tool exists.",
      },
      {
        q: "Can it move around the frame?",
        a: "No, it stays where you put it for the whole clip. A moving mark is harder to crop out, but it needs a timeline editor to produce.",
      },
      {
        q: "Where should I put it?",
        a: "Away from wherever the destination puts its own interface. For anything vertical, that usually means avoiding the very bottom of the frame.",
      },
    ],
  },

  "hide-video-region": {
    intro: `There is a rectangle in your footage that should not be shared. A name badge. A face. A number plate. A wall of email addresses in a screen recording. A logo somebody else owns. The frame is otherwise fine and cropping would throw away the parts you need.

Three treatments are offered and the difference between them is not cosmetic. Blurring smooths the region into a haze; pixelating replaces it with large blocks of averaged colour; solid black covers it outright. All three work here by genuinely replacing the pixels — the region is read out, reduced to a fraction of its size, and drawn back enlarged, so the detail is discarded before the frame is ever encoded. Nothing recoverable remains underneath.

That distinction matters enormously and is where careless redaction goes wrong. A blur applied as a display effect, in a player or a CSS filter, hides information that is still present in the file. A blur applied to the pixels destroys it. If your reason for reaching for this tool is that the information must not reach the person you are sending the video to, only the second kind is any use, and only the second kind is what happens here.

Strength controls how coarse the reduction is. The default is enough to make text unreadable and a face unrecognisable. Turning it far down produces a soft blur that looks tidy and can still be legible when someone stops on a frame, which is worth checking before you rely on it.

The honest limitation: the rectangle stays where you put it for the whole clip. If the thing you are hiding moves — a person walking, a car passing, a camera panning — you will need to trim the video into sections and treat each one where the subject sits still.`,
    steps: [
      "Add the video.",
      "Choose blur, pixelate or solid black, and set the strength.",
      "Position the rectangle with the four sliders and make it generously larger than the thing you are hiding.",
      "Run it, then step through the result frame by frame to confirm nothing is legible.",
    ],
    faq: [
      {
        q: "Can the blur be reversed?",
        a: "No. The pixels underneath are replaced before the frame is encoded, so there is nothing left to recover.",
      },
      {
        q: "Which is safest, blur or black?",
        a: "Solid black leaves nothing to interpret at all. A strong blur or a coarse pixelation is almost always enough, but black is the one that cannot be argued with.",
      },
      {
        q: "Can it follow something that moves?",
        a: "No. The rectangle is fixed for the whole clip. Split the video into sections and handle each one separately if the subject travels.",
      },
      {
        q: "Can I use it to remove a watermark?",
        a: "It will cover one. Whether you should is a separate question — the mark may be there to assert somebody's ownership of the footage.",
      },
    ],
  },

  "screen-recorder": {
    intro: `Every screen recorder you can use without installing something wants you to upload the recording. Read that sentence again in the context of what a screen recording usually contains: an application with your data in it, a browser with your accounts signed in, a document nobody outside your organisation should see, a bug report that includes a customer's details on screen.

This one does not upload anything, and the architecture is the reason rather than the promise. The browser captures the screen, writes the video into memory in this tab, and hands it to the file list on this page. There is no server in the arrangement, so there is nothing to trust, nothing to delete afterwards, and nothing to be breached later.

Press record and the browser asks what to share — a single window, one tab, or the whole screen. Choosing a single window is worth the extra moment: it stops notifications, other applications and anything on a second monitor from wandering into the recording. If you share a tab, the browser will also offer that tab's audio, which is how you capture a video call or a page that plays sound.

Recording ends when you press stop, or when you end the share from the browser's own bar. What comes back appears in the list here as an ordinary file, which means the rest of this site applies to it directly: trim the false start off it, compress it before emailing it, turn a few seconds of it into a GIF for a bug report, or take the audio out as MP3.

A word about what your browser will and will not do. Screen capture works in Chrome, Edge and Firefox on a desktop. It does not work on iOS in any browser at all, because Apple does not permit a web page to record the screen — the built-in recorder in Control Centre is the route there.`,
    steps: [
      "Press record and choose the window, tab or screen to capture.",
      "Tick the option to share audio if the recording needs sound from the page.",
      "Press stop when you are done, or end the share from the browser's bar.",
      "The recording lands in the file list — save it, or run it through the other tools first.",
    ],
    faq: [
      {
        q: "Does the recording get uploaded?",
        a: "No. It is written into memory in this tab and stays there until you save it. There is no server involved at any point.",
      },
      {
        q: "Can I record sound as well?",
        a: "Tab audio, yes — the browser offers it when you choose a tab. Capturing the whole system's sound depends on your operating system and is not always available.",
      },
      {
        q: "Does it work on a phone?",
        a: "Not on iOS, where web pages are not allowed to capture the screen. Use the recorder built into the operating system there.",
      },
      {
        q: "How long can I record for?",
        a: "Until memory becomes the constraint, since the file is held in the tab. Several minutes is comfortable; an hour of full-screen capture is not.",
      },
    ],
  },

  "video-recorder": {
    intro: `Recording from a camera in a browser tab is genuinely useful for the short things nobody wants to open an application for: a introduction for a course, an answer to a question that is quicker to say than to type, a message to somebody who is asleep in another time zone, a piece to camera for a form that wants a video.

What it should not involve is a website receiving that footage. A video of your own face, recorded in your home, is about as personal a file as most people ever make, and the ordinary arrangement — record in a tab, footage goes to a server, download it back — asks you to trust a company with it for no reason at all. Here the recording is written into this tab's memory and appears in the file list on this page. Nothing is transmitted.

The preview shows what is being captured while it records, which catches the two mistakes everyone makes: the wrong camera selected, and a framing that cuts off the top of your head. Microphone audio is captured alongside the picture by default.

The result arrives as a WebM file in most browsers, which is what the browser's own recorder produces. Choosing MP4 in the save options converts it on the way out, which is worth doing if the recording is going anywhere near a piece of software older than about 2015.

Because the recording lands in the file list like any other file, everything else here applies to it. The first four seconds of you reaching for the button can be trimmed off. The result can be compressed before it is emailed. If the camera mirrored you and the writing on your shirt is backwards, the flip tool fixes it.`,
    steps: [
      "Press record and allow the camera when the browser asks.",
      "Check the preview — right camera, sensible framing — before you say anything.",
      "Press stop, and the recording appears in the list on this page.",
      "Save it as MP4, or trim and compress it here first.",
    ],
    faq: [
      {
        q: "Where does the video go?",
        a: "Into this tab's memory, and then into the file list on this page. It is not sent anywhere and no account is involved.",
      },
      {
        q: "Why is it a WebM file?",
        a: "That is what most browsers' recorders produce. Choose MP4 in the save options and it is converted before you download it.",
      },
      {
        q: "Can I choose which camera?",
        a: "The browser decides, usually offering a picker the first time you allow access. Changing the default camera in your system settings is the reliable way to switch.",
      },
      {
        q: "Why is my recording mirrored?",
        a: "Front cameras show and often save a mirror image. Run the result through Flip Video to put any writing the right way round.",
      },
    ],
  },
};
