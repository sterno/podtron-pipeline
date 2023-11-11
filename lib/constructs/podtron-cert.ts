import { Certificate, CertificateValidation } from "aws-cdk-lib/aws-certificatemanager";
import { Construct } from "constructs";
import * as dotenv from 'dotenv';
dotenv.config();

export interface PodtronCert {
    certificate: Certificate
}

export class PodtronCert extends Construct {
    constructor(scope: Construct, id: string) {
        super(scope, id);
 
        const domainName = process.env.DOMAIN_NAME as string;
        this.certificate = new Certificate(this, domainName, {
            domainName: `*.${domainName}`,
            subjectAlternativeNames: [domainName],
            validation: CertificateValidation.fromDns(),
        });
    }
}

export default PodtronCert

