import { describe, it, expect, beforeEach, vi } from 'vitest'
import { Camera } from './camera'

describe('Camera', () => {
  let mockVideo: HTMLVideoElement
  let mockCanvas: HTMLCanvasElement
  let mockContext: CanvasRenderingContext2D
  let mockStream: MediaStream
  let mockTrack: MediaStreamTrack

  beforeEach(() => {
    // Mock DOM elements
    mockVideo = {
      srcObject: null,
      play: vi.fn(),
      onloadedmetadata: null,
      videoWidth: 640,
      videoHeight: 480
    } as unknown as HTMLVideoElement

    mockContext = {
      drawImage: vi.fn()
    } as unknown as CanvasRenderingContext2D

    mockCanvas = {
      getContext: vi.fn(() => mockContext),
      toDataURL: vi.fn(() => 'data:image/png;base64,test'),
      width: 0,
      height: 0
    } as unknown as HTMLCanvasElement

    // Mock MediaStreamTrack
    mockTrack = {
      stop: vi.fn()
    } as unknown as MediaStreamTrack

    // Mock MediaStream
    mockStream = {
      getTracks: vi.fn(() => [mockTrack])
    } as unknown as MediaStream

    // Mock navigator.mediaDevices
    global.navigator = {
      mediaDevices: {
        getUserMedia: vi.fn(() => Promise.resolve(mockStream))
      }
    } as any
  })

  it('should create a Camera instance', () => {
    const camera = new Camera({
      video: mockVideo,
      canvas: mockCanvas
    })
    expect(camera).toBeDefined()
  })

  it('should check if camera is supported', () => {
    const camera = new Camera({
      video: mockVideo,
      canvas: mockCanvas
    })
    expect(camera.isSupported()).toBe(true)
  })

  it('should start camera and set video stream', async () => {
    const camera = new Camera({
      video: mockVideo,
      canvas: mockCanvas
    })

    // Mock getUserMedia to immediately set onloadedmetadata and call it
    global.navigator.mediaDevices.getUserMedia = vi.fn(async () => {
      setTimeout(() => {
        if (mockVideo.onloadedmetadata) {
          mockVideo.onloadedmetadata({} as Event)
        }
      }, 0)
      return mockStream
    })

    await camera.start()

    expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({
      audio: false,
      video: {
        facingMode: 'environment',
        width: { ideal: 640 },
        height: { ideal: 480 }
      }
    })
    expect(mockVideo.srcObject).toBe(mockStream)
    expect(mockVideo.play).toHaveBeenCalled()
  })

  it('should capture image from video', async () => {
    const camera = new Camera({
      video: mockVideo,
      canvas: mockCanvas
    })

    // Mock getUserMedia with immediate callback
    global.navigator.mediaDevices.getUserMedia = vi.fn(async () => {
      setTimeout(() => {
        if (mockVideo.onloadedmetadata) {
          mockVideo.onloadedmetadata({} as Event)
        }
      }, 0)
      return mockStream
    })

    // Start camera first
    await camera.start()

    // Capture image
    const imageData = camera.capture()

    expect(mockCanvas.getContext).toHaveBeenCalledWith('2d')
    expect(mockContext.drawImage).toHaveBeenCalledWith(mockVideo, 0, 0, 640, 480)
    expect(mockCanvas.toDataURL).toHaveBeenCalledWith('image/png')
    expect(imageData).toBe('data:image/png;base64,test')
  })

  it('should stop camera and clean up resources', async () => {
    const camera = new Camera({
      video: mockVideo,
      canvas: mockCanvas
    })

    // Mock getUserMedia with immediate callback
    global.navigator.mediaDevices.getUserMedia = vi.fn(async () => {
      setTimeout(() => {
        if (mockVideo.onloadedmetadata) {
          mockVideo.onloadedmetadata({} as Event)
        }
      }, 0)
      return mockStream
    })

    // Start camera
    await camera.start()

    // Stop camera
    camera.stop()

    expect(mockStream.getTracks).toHaveBeenCalled()
    expect(mockTrack.stop).toHaveBeenCalled()
    expect(mockVideo.srcObject).toBe(null)
  })

  it('should handle permission denied error', async () => {
    global.navigator.mediaDevices.getUserMedia = vi.fn(() => 
      Promise.reject({ name: 'NotAllowedError' })
    )

    const camera = new Camera({
      video: mockVideo,
      canvas: mockCanvas
    })

    await expect(camera.start()).rejects.toThrow('カメラへのアクセスが拒否されました')
  })

  it('should handle camera not found error', async () => {
    global.navigator.mediaDevices.getUserMedia = vi.fn(() => 
      Promise.reject({ name: 'NotFoundError' })
    )

    const camera = new Camera({
      video: mockVideo,
      canvas: mockCanvas
    })

    await expect(camera.start()).rejects.toThrow('カメラが見つかりません')
  })
})