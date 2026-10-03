#![no_std]

#[repr(C)]
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct NetworkEvent {
    pub pid: u32,
    pub dest_ip: u32,
    pub dest_port: u16,
    pub action: u8,
}

impl NetworkEvent {
    /// Safely decodes a `NetworkEvent` from a raw byte slice without unsafe code.
    pub fn from_bytes(bytes: &[u8]) -> Option<Self> {
        if bytes.len() < core::mem::size_of::<Self>() {
            return None;
        }
        let pid = u32::from_ne_bytes(bytes[0..4].try_into().ok()?);
        let dest_ip = u32::from_ne_bytes(bytes[4..8].try_into().ok()?);
        let dest_port = u16::from_ne_bytes(bytes[8..10].try_into().ok()?);
        let action = bytes[10];

        Some(Self {
            pid,
            dest_ip,
            dest_port,
            action,
        })
    }
}
