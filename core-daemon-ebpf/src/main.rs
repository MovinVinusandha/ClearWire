#![cfg_attr(target_arch = "bpf", no_std)]
#![cfg_attr(target_arch = "bpf", no_main)]

#[cfg(target_arch = "bpf")]
use aya_ebpf::{
    helpers::bpf_get_current_pid_tgid,
    macros::{cgroup_sock_addr, map},
    maps::RingBuf,
    programs::SockAddrContext,
};
#[cfg(target_arch = "bpf")]
use core_daemon_common::NetworkEvent;

#[cfg(target_arch = "bpf")]
#[map]
static EVENTS: RingBuf = RingBuf::with_byte_size(256 * 1024, 0);

#[cfg(target_arch = "bpf")]
#[cgroup_sock_addr(connect4)]
pub fn connect4(ctx: SockAddrContext) -> i32 {
    try_connect4(ctx).unwrap_or(1)
}

#[cfg(target_arch = "bpf")]
fn try_connect4(ctx: SockAddrContext) -> Result<i32, i32> {
    let sock_addr = unsafe { &*ctx.sock_addr };
    let dest_ip = u32::from_be(sock_addr.user_ip4);
    let dest_port = u16::from_be(sock_addr.user_port as u16);
    let pid = (bpf_get_current_pid_tgid() >> 32) as u32;

    let event = NetworkEvent {
        pid,
        dest_ip,
        dest_port,
        action: 1,
    };

    if let Some(mut entry) = EVENTS.reserve::<NetworkEvent>(0) {
        entry.write(event);
        entry.submit(0);
    }

    Ok(1)
}

#[cfg(target_arch = "bpf")]
#[panic_handler]
fn panic(_info: &core::panic::PanicInfo) -> ! {
    loop {}
}

#[cfg(not(target_arch = "bpf"))]
fn main() {}
