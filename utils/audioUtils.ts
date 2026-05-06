/**
 * Audio utilities for text-to-speech functionality
 * Handles voice synthesis for different agent personalities
 */

export const speakResponse = (text: string, voiceType: string) => {
  // Check if speech synthesis is available in the browser
  if (!("speechSynthesis" in window)) {
    console.warn("Speech synthesis not supported in this browser")
    return
  }

  // Stop any ongoing speech
  speechSynthesis.cancel()

  // Create new utterance
  const utterance = new SpeechSynthesisUtterance(text)

  // Configure voice settings based on agent personality
  switch (voiceType) {
    case "enthusiastic":
      utterance.rate = 1.1
      utterance.pitch = 1.2
      utterance.volume = 0.9
      break
    case "analytical":
      utterance.rate = 0.9
      utterance.pitch = 0.8
      utterance.volume = 0.8
      break
    case "empathetic":
      utterance.rate = 1.0
      utterance.pitch = 1.1
      utterance.volume = 0.9
      break
    case "robotic":
      utterance.rate = 0.8
      utterance.pitch = 0.7
      utterance.volume = 0.8
      break
    case "sarcastic":
      utterance.rate = 1.2
      utterance.pitch = 0.9
      utterance.volume = 0.9
      break
    default:
      utterance.rate = 1.0
      utterance.pitch = 1.0
      utterance.volume = 0.8
  }

  // Set language preference
  utterance.lang = "en-US"

  // Error handling
  utterance.onerror = (event) => {
    console.error("Speech synthesis error:", event.error)
  }

  utterance.onend = () => {
    console.log("Speech synthesis completed")
  }

  // Speak the text
  try {
    speechSynthesis.speak(utterance)
  } catch (error) {
    console.error("Error starting speech synthesis:", error)
  }
}

/**
 * Stop any ongoing speech synthesis
 */
export const stopSpeech = () => {
  if ("speechSynthesis" in window) {
    speechSynthesis.cancel()
  }
}

/**
 * Check if speech synthesis is supported
 */
export const isSpeechSupported = (): boolean => {
  return "speechSynthesis" in window
}

/**
 * Get available voices for speech synthesis
 */
export const getAvailableVoices = () => {
  if (!("speechSynthesis" in window)) {
    return []
  }
  return speechSynthesis.getVoices()
}
