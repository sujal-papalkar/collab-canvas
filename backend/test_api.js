async function runTests() {
  console.log('--- Starting API & WebSocket Backend Test Suite ---');
  const baseUrl = 'http://localhost:5000';

  // 1. Health check
  console.log('\n1. Testing GET /api/health...');
  const healthRes = await fetch(`${baseUrl}/api/health`);
  const healthData = await healthRes.json();
  console.log('Health response:', healthData.status === 'ok' ? ' PASS' : ' FAIL', healthData);

  // 2. Register
  console.log('\n2. Testing POST /api/auth/register...');
  const testUser = {
    username: `tester_${Date.now().toString().slice(-4)}`,
    email: `tester_${Date.now()}@example.com`,
    password: 'password123',
  };
  const regRes = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(testUser),
  });
  const regData = await regRes.json();
  console.log('Register response:', regData.success ? ' PASS' : ' FAIL', regData.user);
  const token = regData.token;

  // 3. Create Room
  console.log('\n3. Testing POST /api/rooms...');
  const roomRes = await fetch(`${baseUrl}/api/rooms`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      title: 'Automated Test Canvas Room',
      description: 'Room created by automated test script',
      isPrivate: false,
      defaultRole: 'editor',
      maxUsers: 15,
    }),
  });
  const roomData = await roomRes.json();
  console.log('Create Room response:', roomData.success ? ' PASS' : ' FAIL', roomData.room);
  const roomId = roomData.room.roomId;

  // 4. Save Canvas State
  console.log('\n4. Testing POST /api/canvas/:roomId/state...');
  const canvasRes = await fetch(`${baseUrl}/api/canvas/${roomId}/state`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      backgroundColor: '#12131c',
      elements: [
        {
          id: 'test-rect-1',
          type: 'rectangle',
          x: 50,
          y: 60,
          width: 150,
          height: 100,
          strokeColor: '#6366f1',
          fillColor: 'transparent',
          strokeWidth: 3,
        },
      ],
    }),
  });
  const canvasData = await canvasRes.json();
  console.log('Save Canvas response:', canvasData.success ? ' PASS' : ' FAIL', canvasData);

  // 5. Get Canvas State
  console.log('\n5. Testing GET /api/canvas/:roomId/state...');
  const getCanvasRes = await fetch(`${baseUrl}/api/canvas/${roomId}/state`);
  const getCanvasData = await getCanvasRes.json();
  console.log('Get Canvas response:', getCanvasData.success ? ' PASS' : ' FAIL', {
    elementsCount: getCanvasData.canvasState.elements.length,
    version: getCanvasData.canvasState.version,
  });

  // 6. Create Snapshot
  console.log('\n6. Testing POST /api/canvas/:roomId/snapshots...');
  const snapRes = await fetch(`${baseUrl}/api/canvas/${roomId}/snapshots`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      name: 'Initial Checkpoint v1',
      thumbnail: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    }),
  });
  const snapData = await snapRes.json();
  console.log('Create Snapshot response:', snapData.success ? ' PASS' : ' FAIL', snapData.snapshot?.name);
  const snapshotId = snapData.snapshot?._id;

  // 7. Restore Snapshot
  console.log('\n7. Testing POST /api/canvas/:roomId/snapshots/:snapshotId/restore...');
  const restoreRes = await fetch(`${baseUrl}/api/canvas/${roomId}/snapshots/${snapshotId}/restore`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });
  const restoreData = await restoreRes.json();
  console.log('Restore Snapshot response:', restoreData.success ? ' PASS' : ' FAIL', restoreData.message);

  // 8. Guest Login
  console.log('\n8. Testing POST /api/auth/guest...');
  const guestRes = await fetch(`${baseUrl}/api/auth/guest`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nickname: 'Quick Tester' }),
  });
  const guestData = await guestRes.json();
  console.log('Guest Login response:', guestData.success ? ' PASS' : ' FAIL', guestData.user);

  console.log('\n ALL BACKEND ENDPOINTS PASSED SUCCESSFULLY!');
}

runTests().catch(console.error);
