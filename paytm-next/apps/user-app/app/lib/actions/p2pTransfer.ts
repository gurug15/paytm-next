'use server'

import { getServerSession } from "next-auth"
import { authOptions } from "../auth"
import prisma from "@repo/db/client";

export async function  p2pTransfer(to:string,amount:number) {
    const session = await getServerSession(authOptions);
    const from= session?.user?.id;
    if(!from){
        return {
            message:"error while sending"
        }
    }
    const toUser = await prisma.user.findUnique({
        where : {number:to}
    })
    
    if(!toUser){
        return {
            message:"user not found"
        }
    }
    await prisma.$transaction(async (tx)=>{
        await tx.$queryRaw`SELECT * FROM "Balance" WHERE "userId" = ${Number(from)} FOR UPDATE`;
        const fromBalance = await tx.balance.findUnique({
            where:{userId:Number(from)}
        })
        if(!fromBalance || fromBalance.amount < amount){
           throw new Error('insufficient funds')
        }

        await tx.balance.update({
            where:{ userId: Number(from) },
            data:{ amount : { decrement:amount } }
        })
        await tx.balance.update({
            where:{ userId: toUser.id },
            data:{ amount: {increment:amount} }
        });
        await tx.p2PTransfer.create({
            data:{
                amount,
                timestamp: new Date(),
                fromUserId: Number(from),
                toUserId:toUser.id,

            }
        })
    })
}