# WebSocket Connectivity Framework

## Overview

This document outlines the WebSocket connectivity framework used in the Benton County Assessor's Office Platform, including the fallback mechanisms designed to ensure continuous operation even when WebSocket connections fail.

## Architecture

The system employs a dual-transport communication strategy:

1. **Primary: WebSocket/Socket.IO** - Used for real-time, bidirectional communication
2. **Fallback: REST API Polling** - Used when WebSocket connections cannot be established

## Components

### 1. Client-Side Implementation

The client-side implementation is managed through the `AgentSocketIOService` class which:

- Attempts to establish Socket.IO connections
- Automatically detects connection failures
- Gracefully falls back to REST API polling when WebSockets are unavailable
- Provides status indicators to inform users of the current connection state

### 2. Server-Side Implementation

The server-side provides dual endpoints:

- Socket.IO endpoints for real-time communication
- Parallel REST API endpoints that deliver the same functionality

### 3. Connection Status Tracking

The system defines several connection states:

```typescript
export enum ConnectionStatus {
  DISCONNECTED,
  CONNECTING,
  CONNECTED,
  ERRORED
}
```

These states are used to track and communicate the current connection state to both the system and users.

## Fallback Mechanism

### Trigger Conditions

The fallback mechanism is triggered under the following conditions:

- Socket.IO connection errors
- Maximum reconnection attempts exceeded
- Socket.IO reconnection failures
- Server-side Socket.IO disconnection

### Fallback Process

When fallback is triggered:

1. The system marks the connection as using fallback (`usingFallback = true`)
2. Authentication is performed via REST API instead of Socket.IO
3. A polling mechanism is established to periodically check for new messages
4. User notifications indicate the system is operating in fallback mode

### Recovery Process

The system continuously attempts to re-establish WebSocket connections. When successful:

1. The fallback polling is stopped
2. The system returns to using Socket.IO
3. User notifications about fallback mode are cleared

## User Experience Considerations

### Notifications

Users are notified of connection status changes through:

- The `ConnectionNotification` component, which displays a notification when the system is operating in fallback mode
- This notification appears at the bottom right of the screen and automatically hides after 30 seconds

### Performance Implications

When operating in fallback mode:

- Latency may be slightly higher due to HTTP polling overhead
- Data updates may be less immediate compared to WebSocket mode
- All functionality remains available, ensuring business continuity

## Resilience Benefits

This dual-transport architecture provides several benefits:

1. **High Availability** - System remains functional even when WebSockets are blocked or unavailable
2. **Graceful Degradation** - Users experience minimal disruption during transport failures
3. **Network Compatibility** - Works in environments where WebSockets may be blocked (certain proxies, firewalls)
4. **Self-Healing** - Automatically attempts to restore optimal communication methods

## Security Considerations

The fallback mechanism maintains security through:

1. **Consistent Authentication** - Both transport methods use the same authentication mechanisms
2. **Encrypted Communication** - All communication uses HTTPS
3. **Rate Limiting** - Polling frequency is controlled to prevent server overload
4. **Timeout Handling** - Requests include appropriate timeouts to prevent hanging connections

## Implementation Details

### Checking Fallback Status

```typescript
// Check if system is using fallback mode
const isFallbackActive = agentSocketService.isUsingFallback();
```

### Listening for Connection Status Changes

```typescript
agentSocketService.onConnectionStatusChange((status) => {
  if (status === ConnectionStatus.ERRORED) {
    // Handle error state
  }
});
```

## Future Enhancements

Potential improvements to the connectivity framework include:

1. **Adaptive Polling Frequency** - Dynamically adjust polling rates based on system load and activity
2. **Advanced Diagnostics** - Provide more detailed information about connection failures
3. **Connection Quality Metrics** - Measure and report on connection performance

## Conclusion

The WebSocket connectivity framework with REST API fallback ensures the Benton County Assessor's Office Platform remains operational under varying network conditions, providing a consistent user experience while maximizing system availability.