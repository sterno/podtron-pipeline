import { Construct } from "constructs";
import * as cdk from 'aws-cdk-lib';
import * as dotenv from 'dotenv';
import { Certificate } from "aws-cdk-lib/aws-certificatemanager";
import PodtronCert from "./constructs/podtron-cert";

interface PodtronCertStack {
    certificate: Certificate
}

/*
    This must be a separate stack because the certs all have to originate from us-east-1
*/
class PodtronCertStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        //Generate certificate
        const podtronCert = new PodtronCert(this, `${process.env.ENV_PREFIX}podtron-cert`);
        this.certificate = podtronCert.certificate;
    }
}

export default PodtronCertStack;