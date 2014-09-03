module.exports = {
    port: 8080,
    enable_ssl: true,
    server_certificate: "",
    private_key: "",
    private_key_pass: "",
    ca_cert: "",
    behind_reverse_proxy: false,
    log_level: 'info',
    webrtc: {
        ice_servers: [],
        video: { audio: true, video: { mandatory: {}, optional: [] } },
        pc: { optional: [ {DtlsSrtpKeyAgreement: true} ] }
    }
};
