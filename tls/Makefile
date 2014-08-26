
all: server-cert.pem test-key-and-cert.p12

# Create CA cert
ca-cert.pem: ca.cnf
	openssl req -new -x509 -days 9999 -config ca.cnf -keyout ca-key.pem -out ca-cert.pem

SERVER_PASSPHRASE := changeme_password
# Create Proxy Server key
server-key.pem:
	openssl genrsa -passout "pass:$(SERVER_PASSPHRASE)" -aes256 -out server-key.pem 1024
server-csr.pem: server.cnf server-key.pem
	openssl req -new -config server.cnf -key server-key.pem -passin "pass:$(SERVER_PASSPHRASE)" -out server-csr.pem
# Self-signed certificate using out SVMP CA
server-cert.pem: server-csr.pem ca-cert.pem
	openssl x509 -req \
		-days 9999 \
		-passin "pass:password" \
		-in server-csr.pem \
		-CA ca-cert.pem \
		-CAkey ca-key.pem \
		-CAcreateserial \
		-out server-cert.pem
server-verify: server-cert.pem ca-cert.pem
	openssl verify -CAfile ca-cert.pem server-cert.pem



# Create a test client signed with CA
test-key.pem:
	openssl genrsa -out test-key.pem 1024
test-csr.pem: client.cnf test-key.pem
	openssl req -new -config client.cnf -key test-key.pem -out test-csr.pem
# Self-signed certificate using out SVMP CA
test-cert.pem: test-csr.pem ca-cert.pem
	openssl x509 -req \
		-days 9999 \
		-passin "pass:password" \
		-in test-csr.pem \
		-CA ca-cert.pem \
		-CAkey ca-key.pem \
		-CAcreateserial \
		-out test-cert.pem
# Combined key/cert for use on client devices
test-key-and-cert.p12: test-cert.pem
	openssl pkcs12 -export \
		-inkey test-key.pem \
		-passin "pass:password" \
		-in test-cert.pem \
		-passout "pass:password" \
		-out test-key-and-cert.p12

test-client-verify: test-cert.pem ca-cert.pem
	openssl verify -CAfile ca-cert.pem test-cert.pem


clean:
	rm -f *.pem *.p12 *.srl
