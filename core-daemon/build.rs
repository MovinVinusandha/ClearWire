use anyhow::Result;

fn main() -> Result<()> {
    tonic_build::compile_protos("../proto/clearwire.proto")?;
    aya_build::build_ebpf(
        [aya_build::Package {
            name: "core-daemon-ebpf",
            root_dir: "../core-daemon-ebpf",
            ..Default::default()
        }],
        aya_build::Toolchain::Nightly,
    )?;
    Ok(())
}
