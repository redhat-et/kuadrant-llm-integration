package main

import (
	"fmt"
	"io"
	"log"
	"net"
	"os"
	"strconv"

	"promptlengthdemo/processor"

	extprocv3 "github.com/envoyproxy/go-control-plane/envoy/service/ext_proc/v3"
	corev3 "github.com/envoyproxy/go-control-plane/envoy/config/core/v3"
	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

type server struct {
	extprocv3.UnimplementedExternalProcessorServer
	cfg processor.Config
}

func (s *server) Process(stream extprocv3.ExternalProcessor_ProcessServer) error {
	log.Println("[ext_proc] new stream connected")
	
	for {
		req, err := stream.Recv()
		if err == io.EOF {
			log.Println("[ext_proc] stream closed by client")
			return nil
		}
		if err != nil {
			log.Printf("[ext_proc] error receiving request: %v", err)
			return status.Errorf(codes.Unknown, "error receiving request: %v", err)
		}

		log.Printf("[ext_proc] received request type: %T", req.Request)
		
		var resp *extprocv3.ProcessingResponse
		
		// Handle request headers phase
		if reqHeaders := req.GetRequestHeaders(); reqHeaders != nil {
			log.Println("[ext_proc] processing request headers")
			resp = &extprocv3.ProcessingResponse{
				Response: &extprocv3.ProcessingResponse_RequestHeaders{
					RequestHeaders: &extprocv3.HeadersResponse{
						Response: &extprocv3.CommonResponse{
							Status: extprocv3.CommonResponse_CONTINUE,
						},
					},
				},
			}
		} else if reqBody := req.GetRequestBody(); reqBody != nil {
			// Handle request body phase - this is where we process the prompt
			log.Printf("[ext_proc] processing request body, length: %d", len(reqBody.GetBody()))
			
			if len(reqBody.GetBody()) == 0 {
				log.Println("[ext_proc] empty body, continuing")
				resp = &extprocv3.ProcessingResponse{
					Response: &extprocv3.ProcessingResponse_RequestBody{
						RequestBody: &extprocv3.BodyResponse{
							Response: &extprocv3.CommonResponse{
								Status: extprocv3.CommonResponse_CONTINUE,
							},
						},
					},
				}
			} else {
				// Process the prompt
				body := reqBody.GetBody()
				length, sizeClass, err := processor.ProcessRequest(body, s.cfg)
				if err != nil {
					log.Printf("[ext_proc] error processing request: %v", err)
					resp = &extprocv3.ProcessingResponse{
						Response: &extprocv3.ProcessingResponse_RequestBody{
							RequestBody: &extprocv3.BodyResponse{
								Response: &extprocv3.CommonResponse{
									Status: extprocv3.CommonResponse_CONTINUE,
								},
							},
						},
					}
				} else {
					log.Printf("[ext_proc] prompt length: %d, size class: %s", length, sizeClass)
					// Inject headers in the request body response
					resp = &extprocv3.ProcessingResponse{
						Response: &extprocv3.ProcessingResponse_RequestBody{
							RequestBody: &extprocv3.BodyResponse{
								Response: &extprocv3.CommonResponse{
									Status: extprocv3.CommonResponse_CONTINUE,
									HeaderMutation: &extprocv3.HeaderMutation{
										SetHeaders: []*corev3.HeaderValueOption{
											{
												Header: &corev3.HeaderValue{
													Key:   "x-prompt-length",
													Value: fmt.Sprintf("%d", length),
												},
											},
											{
												Header: &corev3.HeaderValue{
													Key:   "x-prompt-size-class",
													Value: sizeClass,
												},
											},
										},
									},
								},
							},
						},
					}
				}
			}
		} else {
			// Handle other phases (response headers, trailers, etc.) - just continue
			log.Println("[ext_proc] handling other request type, continuing")
			resp = &extprocv3.ProcessingResponse{
				Response: &extprocv3.ProcessingResponse_RequestHeaders{
					RequestHeaders: &extprocv3.HeadersResponse{
						Response: &extprocv3.CommonResponse{
							Status: extprocv3.CommonResponse_CONTINUE,
						},
					},
				},
			}
		}

		if err := stream.Send(resp); err != nil {
			log.Printf("[ext_proc] error sending response: %v", err)
			return status.Errorf(codes.Unknown, "error sending response: %v", err)
		}
		log.Println("[ext_proc] response sent successfully")
	}
}

func getEnvInt(key string, def int) int {
	if v := os.Getenv(key); v != "" {
		if i, err := strconv.Atoi(v); err == nil {
			return i
		}
	}
	return def
}

func main() {
	cfg := processor.Config{
		SmallThreshold:  getEnvInt("SMALL_THRESHOLD", 1024),
		MediumThreshold: getEnvInt("MEDIUM_THRESHOLD", 2048),
		LargeThreshold:  getEnvInt("LARGE_THRESHOLD", 2048),
	}
	
	lis, err := net.Listen("tcp", ":50051")
	if err != nil {
		log.Fatalf("failed to listen: %v", err)
	}
	
	grpcServer := grpc.NewServer()
	extprocv3.RegisterExternalProcessorServer(grpcServer, &server{cfg: cfg})
	
	log.Println("[ext_proc] gRPC server listening on :50051")
	if err := grpcServer.Serve(lis); err != nil {
		log.Fatalf("failed to serve: %v", err)
	}
} 