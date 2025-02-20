import React, { useEffect, useRef, useState } from 'react';
import io from "socket.io-client";
import Peer from 'simple-peer';
import { toast } from 'sonner';
import copy from 'clipboard-copy';
import { IoCall, IoCopy, IoVideocam, IoMic, IoMicOff, IoVideocamOff, IoCallOutline, IoClose } from "react-icons/io5";

const socket = io.connect("https://api.ejobs.com.ng");

const Chat = () => {
  const [me, setMe] = useState("");
  const [stream, setStream] = useState();
  const [recievingCall, setRecievingCall] = useState(false);
  const [caller, setCaller] = useState('');
  const [callerSignal, setCallerSignal] = useState();
  const [callAccepted, setCallAccepted] = useState(false);
  const [idToCall, setIdToCall] = useState('');
  const [callEnded, setCallEnded] = useState(false);
  const [name, setName] = useState('');
  const [otherUserName, setOtherUserName] = useState('');
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);

  const myVideo = useRef();
  const userVideo = useRef();
  const connectionRef = useRef();

  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then((stream) => {
        setStream(stream);
        if (myVideo.current) {
          myVideo.current.srcObject = stream;
        }
      });

    socket.on("me", (id) => {
      setMe(id);
    });

    socket.on("callUser", (data) => {
      console.log('call initiated --> from ', data)
      setRecievingCall(true);
      setCaller(data.from);
      setOtherUserName(data.name);
      setCallerSignal(data.signal);
    });
  }, []);

  useEffect(() => {
    let localStream;
    // ... initialization code ...
  
    return () => {
      // Stop all tracks when component unmounts
      if (localStream) {
        localStream.getTracks().forEach(track => {
          track.stop();
        });
      }
      
      // Clean up socket listeners
      socket.off("me");
      socket.off("callUser");
      socket.off("callAccepted");
      
      // Destroy peer connection
      if (connectionRef.current) {
        connectionRef.current.destroy();
      }
    };
  }, []);

  const callUser = (id) => {
    const peer = new Peer({
      initiator: true,
      trickle: false,
      stream: stream
    });

    peer.on("signal", (data) => {
      socket.emit("callUser", {
        usertoCall: id,
        signalData: data,
        from: me,
        name: name
      });
    });

    peer.on("stream", (stream) => {
      userVideo.current.srcObject = stream;
    });

    socket.on("callAccepted", (signal) => {
      setCallAccepted(true);
      setOtherUserName(signal.from)
      peer.signal(signal.signal);
    });

    connectionRef.current = peer;
  };

  const answerCall = () => {
    setCallAccepted(true);
    const peer = new Peer({
      initiator: false,
      trickle: false,
      stream: stream
    });

    peer.on("signal", (data) => {
      socket.emit("answerCall", { signal: data, to: caller, from: name || 'Anonymous' });
    });

    peer.on("stream", (stream) => {
      userVideo.current.srcObject = stream;
    });

    peer.signal(callerSignal);
    connectionRef.current = peer;
  };

  const leaveCall = () => {
    try {
      setCallEnded(true);
      
      if (userVideo.current && userVideo.current.srcObject) {
        userVideo.current.srcObject.getTracks().forEach(track => track.stop());
        userVideo.current.srcObject = null;
      }
  
      if (connectionRef.current) {
        connectionRef.current.destroy();
        connectionRef.current = null;
      }
  
      setCallAccepted(false);
      setRecievingCall(false);
      setCaller('');
      setCallerSignal(null);
      setIdToCall('');
      socket.off("callAccepted");
      toast.success("Call ended");
    } catch (err) {
      console.error("Error ending call:", err);
      toast.error("Error ending call");
    }
  };

  const handleCopy = () => {
    try {
      copy(me);
      toast.success('ID copied to clipboard');
    } catch (error) {
      toast.error('Error copying ID');
      console.log(error);
    }
  };

  const toggleMute = () => {
    if (stream) {
      stream.getAudioTracks()[0].enabled = !stream.getAudioTracks()[0].enabled;
      setIsMuted(!isMuted);
    }
  };

  const toggleVideo = () => {
    if (stream) {
      stream.getVideoTracks()[0].enabled = !stream.getVideoTracks()[0].enabled;
      setIsVideoOff(!isVideoOff);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Video Chat</h1>

        {/* Video Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* My Video */}
          <div className="relative rounded-2xl overflow-hidden bg-gray-800 aspect-video">
            {stream && (
              <video
                playsInline
                muted
                ref={myVideo}
                autoPlay
                className="w-full h-full object-cover"
              />
            )}
            <div className="absolute bottom-4 left-4">
              <p className="text-sm bg-black/50 px-3 py-1 rounded-full">
                {name || 'You'}
              </p>
            </div>
            <div className="absolute bottom-4 right-4 flex gap-2">
              <button
                onClick={toggleMute}
                className="p-2 rounded-full bg-gray-800 hover:bg-gray-700 transition-colors"
              >
                {isMuted ? <IoMicOff size={20} /> : <IoMic size={20} />}
              </button>
              <button
                onClick={toggleVideo}
                className="p-2 rounded-full bg-gray-800 hover:bg-gray-700 transition-colors"
              >
                {isVideoOff ? <IoVideocamOff size={20} /> : <IoVideocam size={20} />}
              </button>
            </div>
          </div>

          {/* Remote Video */}
          {callAccepted && !callEnded && (
            <div className="relative rounded-2xl overflow-hidden bg-gray-800 aspect-video">
              <video
                playsInline
                ref={userVideo}
                autoPlay
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-4 left-4">
                <p className="text-sm bg-black/50 px-3 py-1 rounded-full">
                  {otherUserName || 'Remote User'}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="max-w-md mx-auto bg-gray-800 rounded-2xl p-6 shadow-xl">
          <div className="space-y-4">
            {/* Name Input */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium mb-2">
                Your Name
              </label>
              <input
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2 bg-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                name="name"
                id="name"
                type="text"
                placeholder="Enter your name"
              />
            </div>

            {/* ID Section */}
            <div className="flex gap-2">
              <input
                type="text"
                value={me}
                readOnly
                className="flex-1 px-4 py-2 bg-gray-700 rounded-lg"
                placeholder="Your ID"
              />
              <button
                onClick={handleCopy}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg flex items-center gap-2 transition-colors"
              >
                <IoCopy size={18} />
                Copy
              </button>
            </div>

            {/* Call Section */}
            <div>
              <label htmlFor="idToCall" className="block text-sm font-medium mb-2">
                ID to Call
              </label>
              <div className="flex gap-2">
                <input
                  onChange={(e) => setIdToCall(e.target.value)}
                  value={idToCall}
                  className="flex-1 px-4 py-2 bg-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  name="idToCall"
                  id="idToCall"
                  type="text"
                  placeholder="Enter ID to call"
                />
                {callAccepted && !callEnded ? (
                  <button
                    onClick={leaveCall}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg flex items-center gap-2 transition-colors"
                  >
                    <IoClose size={20} />
                    End
                  </button>
                ) : (
                  <button
                    onClick={() => callUser(idToCall)}
                    disabled={!idToCall}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <IoCallOutline size={20} />
                    Call
                  </button>
                )}
              </div>
            </div>

            {/* Incoming Call */}
            {recievingCall && !callAccepted && (
              <div className="mt-4 p-4 bg-gray-700 rounded-lg">
                <p className="text-center mb-3">{name} is calling...</p>
                <button
                  onClick={answerCall}
                  className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg flex items-center justify-center gap-2 transition-colors"
                >
                  <IoCall size={20} />
                  Answer Call
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Chat;