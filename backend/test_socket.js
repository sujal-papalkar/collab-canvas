import { io } from 'socket.io-client';

async function testSocket() {
  console.log('--- Testing Socket.io WebSocket Multi-User Sync ---');
  const socket1 = io('http://localhost:5000', {
    auth: { guestName: 'Client_Alpha' },
  });

  const socket2 = io('http://localhost:5000', {
    auth: { guestName: 'Client_Beta' },
  });

  const testRoomId = 'room-socket-test-101';

  await new Promise((resolve) => {
    let s1Connected = false;
    let s2Connected = false;

    socket1.on('connect', () => {
      console.log(' Socket 1 connected:', socket1.id);
      s1Connected = true;
      socket1.emit('join-room', { roomId: testRoomId });
      if (s1Connected && s2Connected) resolve();
    });

    socket2.on('connect', () => {
      console.log(' Socket 2 connected:', socket2.id);
      s2Connected = true;
      socket2.emit('join-room', { roomId: testRoomId });
      if (s1Connected && s2Connected) resolve();
    });
  });

  // Verify Socket 2 receives cursor and drawing events emitted by Socket 1
  let strokeReceived = false;
  let cursorReceived = false;
  let chatReceived = false;

  socket2.on('remote-cursor-move', (data) => {
    console.log(' Socket 2 received remote cursor from Socket 1:', data.username, `(${data.x}, ${data.y})`);
    cursorReceived = true;
  });

  socket2.on('element-created', (el) => {
    console.log(' Socket 2 received new element from Socket 1:', el.type, el.id);
    strokeReceived = true;
  });

  socket2.on('chat-message', (msg) => {
    if (msg.message === 'Hello Socket 2!') {
      console.log(' Socket 2 received chat message:', msg.message, 'from', msg.senderName);
      chatReceived = true;
    }
  });

  // Wait a moment for join to register
  await new Promise((r) => setTimeout(r, 500));

  // Socket 1 emits cursor move
  socket1.emit('cursor-move', { x: 250, y: 350, tool: 'pencil', isDrawing: true });

  // Socket 1 emits element create
  socket1.emit('element-create', {
    id: 'elem-test-sync-1',
    type: 'circle',
    x: 100,
    y: 100,
    width: 80,
    height: 80,
    strokeColor: '#ec4899',
    fillColor: 'transparent',
    strokeWidth: 4,
  });

  // Socket 1 emits chat message
  socket1.emit('send-chat', { message: 'Hello Socket 2!' });

  await new Promise((r) => setTimeout(r, 1200));

  console.log('\n--- Real-Time WebSocket Verification Summary ---');
  console.log('Cursor sync verified:', cursorReceived ? ' PASS' : ' FAIL');
  console.log('Drawing element sync verified:', strokeReceived ? ' PASS' : ' FAIL');
  console.log('Live chat sync verified:', chatReceived ? ' PASS' : ' FAIL');

  socket1.disconnect();
  socket2.disconnect();
  process.exit(0);
}

testSocket().catch(console.error);
